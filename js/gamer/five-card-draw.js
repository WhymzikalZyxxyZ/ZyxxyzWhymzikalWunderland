/* global getOrCreateUsername, rankLabel, suitSymbol, newFCDState, startFCDHand, fcdAction, fcdDraw, getFCDAIAction, FCD_ANTE, evaluateHand */
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

        const myName   = (typeof getOrCreateUsername === 'function') ? getOrCreateUsername() : 'Guest';
        const FB_HS    = 'scores/fivecarddraw';
        const AI_NAMES = ['Aria','Blake','Casey','Dana','Ellis'];
        const PHASES   = ['bet1','draw','bet2','showdown'];

        let state = null, mode = 'sp', myIdx = 0;
        let roomId = null, roomRef = null, isHost = false, mpMyIdx = null;
        let aiTimer = null;
        let selectedCards = new Set(); // indices of cards selected for discard

        // ── Card rendering ────────────────────────────────────────────────────
        function cardEl(card, faceDown, idx) {
            const d = document.createElement('div');
            if (faceDown) { d.className = 'card back'; return d; }
            if (!card)    { d.className = 'card ghost'; return d; }
            d.className = 'card' + ((card.suit === 'H' || card.suit === 'D') ? ' red' : '');
            const lbl = rankLabel(card.rank) + suitSymbol(card.suit);
            d.innerHTML = `<span>${lbl}</span><span class="card-b">${lbl}</span>`;
            if (idx !== undefined) {
                d.dataset.idx = idx;
                d.onclick = () => toggleCard(idx);
            }
            return d;
        }

        function toggleCard(idx) {
            if (!state || state.phase !== 'draw') return;
            const humanIdx = mode === 'sp' ? myIdx : mpMyIdx;
            if (state.activePlayerIdx !== humanIdx) return;
            if (selectedCards.has(idx)) selectedCards.delete(idx);
            else selectedCards.add(idx);
            renderYourCards();
        }

        function renderYourCards() {
            const humanIdx = mode === 'sp' ? myIdx : (mpMyIdx !== null ? mpMyIdx : -1);
            if (humanIdx < 0 || !state) return;
            const me = state.players[humanIdx];
            const container = document.getElementById('your-cards');
            container.innerHTML = '';
            (me.hand || []).forEach((c, i) => {
                const el = cardEl(c, false, i);
                if (selectedCards.has(i)) el.classList.add('selected');
                container.appendChild(el);
            });
            document.getElementById('selected-count').textContent = selectedCards.size;
        }

        // ── Mode switching ────────────────────────────────────────────────────
        function setMode(m) {
            mode = m;
            document.getElementById('tab-sp').classList.toggle('active', m === 'sp');
            document.getElementById('tab-mp').classList.toggle('active', m === 'mp');
            document.getElementById('sp-setup').style.display = m === 'sp' ? '' : 'none';
            document.getElementById('mp-setup').style.display = m === 'mp' ? '' : 'none';
            document.getElementById('game-panel').style.display = 'none';
        }

        // ── SP ────────────────────────────────────────────────────────────────
        function spStart() {
            const n = +document.getElementById('sp-count').value;
            state  = newFCDState([myName, ...AI_NAMES.slice(0, n - 1)]);
            myIdx  = 0;
            state  = startFCDHand(state);
            selectedCards.clear();
            document.getElementById('game-panel').style.display = '';
            renderState();
            runAITurns();
        }

        function newHand() {
            if (mode === 'sp') {
                state = { ...state, dealerIdx:(state.dealerIdx + 1) % state.players.length };
                state = startFCDHand(state);
                selectedCards.clear();
                renderState();
                runAITurns();
            } else if (isHost) {
                let ns = { ...state, dealerIdx:(state.dealerIdx + 1) % state.players.length };
                ns = startFCDHand(ns);
                pushMPState(ns);
            } else {
                roomRef && roomRef.child('requestNewHand').set(myName);
            }
        }

        function doBetAction(action, amount) {
            if (!state) return;
            const humanIdx = mode === 'sp' ? myIdx : mpMyIdx;
            if (state.activePlayerIdx !== humanIdx) return;
            if (mode === 'sp') {
                state = fcdAction(state, action, amount);
                selectedCards.clear();
                renderState();
                if (state.phase !== 'showdown') runAITurns();
                else onShowdown();
            } else {
                if (isHost) {
                    state = fcdAction(state, action, amount);
                    pushMPState(state);
                } else {
                    roomRef.child('pendingAction').set({ username:myName, action, amount:amount||0, ts:Date.now() });
                }
            }
        }

        function doDraw() {
            const humanIdx = mode === 'sp' ? myIdx : mpMyIdx;
            if (!state || state.activePlayerIdx !== humanIdx) return;
            const discards = Array.from(selectedCards);
            if (mode === 'sp') {
                state = fcdDraw(state, humanIdx, discards);
                selectedCards.clear();
                renderState();
                if (state.phase !== 'showdown') runAITurns();
                else onShowdown();
            } else {
                if (isHost) {
                    state = fcdDraw(state, humanIdx, discards);
                    pushMPState(state);
                } else {
                    roomRef.child('pendingAction').set({ username:myName, action:'draw', discards, ts:Date.now() });
                }
            }
        }

        function standPat() {
            selectedCards.clear();
            renderYourCards();
            doDraw();
        }

        function runAITurns() {
            clearTimeout(aiTimer);
            if (!state || state.phase === 'showdown' || state.phase === 'waiting') return;
            if (state.activePlayerIdx === myIdx) { showMyActions(); return; }
            hideAllActions();
            aiTimer = setTimeout(() => {
                if (!state || state.activePlayerIdx === myIdx) return;
                const ai = getFCDAIAction(state, state.activePlayerIdx);
                if (ai.action === 'draw') {
                    state = fcdDraw(state, state.activePlayerIdx, ai.discards);
                } else {
                    state = fcdAction(state, ai.action, ai.amount);
                }
                selectedCards.clear();
                renderState();
                if (state.phase === 'showdown') onShowdown();
                else runAITurns();
            }, 700);
        }

        function onShowdown() {
            if (mode === 'sp') maybeUpdateHighScore(state.players[myIdx].chips);
        }

        function showMyActions() {
            if (!state) return;
            const humanIdx = mode === 'sp' ? myIdx : mpMyIdx;
            if (humanIdx === null || humanIdx < 0) return;
            const me = state.players[humanIdx];
            if (me.folded) { hideAllActions(); return; }

            if (state.phase === 'draw') {
                document.getElementById('draw-panel').style.display = '';
                document.getElementById('bet-panel').style.display  = 'none';
                document.getElementById('draw-hint').style.display  = '';
            } else if (state.phase === 'bet1' || state.phase === 'bet2') {
                document.getElementById('draw-panel').style.display = 'none';
                document.getElementById('bet-panel').style.display  = '';
                document.getElementById('draw-hint').style.display  = 'none';
                const toCall = state.currentBet - me.bet;
                document.getElementById('btn-call').textContent  = toCall > 0 ? `Call $${toCall}` : 'Call';
                document.getElementById('btn-call').disabled     = toCall === 0;
                document.getElementById('btn-check').disabled    = toCall > 0;
                document.getElementById('raise-input').min       = Math.max(FCD_ANTE, state.currentBet - me.bet + FCD_ANTE);
            } else {
                hideAllActions();
            }
        }

        function hideAllActions() {
            document.getElementById('draw-panel').style.display = 'none';
            document.getElementById('bet-panel').style.display  = 'none';
            document.getElementById('draw-hint').style.display  = 'none';
        }

        // ── Render ────────────────────────────────────────────────────────────
        function renderState() {
            if (!state) return;
            const humanIdx = mode === 'sp' ? myIdx : (mpMyIdx !== null ? mpMyIdx : -1);
            const phIdx = PHASES.indexOf(state.phase);

            const phaseNames = { bet1:'Bet 1', draw:'Draw', bet2:'Bet 2', showdown:'Showdown', waiting:'Waiting' };
            document.getElementById('phase-label').textContent = phaseNames[state.phase] || state.phase;
            const dealer = state.players[state.dealerIdx];
            document.getElementById('dealer-label').textContent = dealer ? '[Dealer: '+dealer.name+']' : '';

            PHASES.forEach((ph, i) => {
                const el = document.getElementById('ph-' + ph);
                el.className = 'phase-step' +
                    (i < phIdx ? ' done' : i === phIdx ? ' active' : '');
            });

            document.getElementById('pot-val').textContent = state.pot;
            document.getElementById('bet-val').textContent = state.currentBet;

            const winnerId = state.winner;
            const hrMap = {};
            (state.handResults||[]).forEach(hr => hrMap[hr.id] = hr.eval);

            // Opponents grid
            const grid = document.getElementById('players-grid');
            grid.innerHTML = '';
            state.players.forEach((p, i) => {
                if (i === humanIdx) return;
                const isActive  = state.activePlayerIdx === i && state.phase !== 'showdown';
                const isWinner  = p.id === winnerId;
                const showCards = state.phase === 'showdown' && !p.folded;

                const seat = document.createElement('div');
                seat.className = 'player-seat' +
                    (isActive  ? ' active'  : '') +
                    (p.folded  ? ' folded'  : '') +
                    (isWinner  ? ' winner'  : '');

                const cardsDiv = document.createElement('div');
                cardsDiv.className = 'seat-cards';
                if (showCards) {
                    (p.hand||[]).forEach(c => cardsDiv.appendChild(cardEl(c, false)));
                } else if (p.hand && p.hand.length) {
                    p.hand.forEach(() => cardsDiv.appendChild(cardEl(null, true)));
                }

                const status = p.folded ? 'FOLDED' :
                    (state.phase === 'draw' && !p.drawn ? 'DRAWING…' :
                    (isActive ? 'THINKING…' : ''));
                const handName = (showCards && hrMap[p.id]) ? hrMap[p.id].name : '';

                seat.innerHTML = `
                    <div class="seat-name">${escHtml(p.name)}${isWinner ? ' ★' : ''}</div>
                    <div class="seat-chips">$${p.chips}</div>
                    <div class="seat-bet">${p.bet > 0 ? 'Bet: $'+p.bet : ''}</div>
                `;
                seat.appendChild(cardsDiv);
                if (status) {
                    const s=document.createElement('div'); s.className='seat-status'; s.textContent=status; seat.appendChild(s);
                }
                if (handName) {
                    const hn=document.createElement('div');
                    hn.className='hand-name'+(isWinner?' winner':''); hn.textContent=handName; seat.appendChild(hn);
                }
                grid.appendChild(seat);
            });

            // Your hand
            if (humanIdx >= 0 && humanIdx < state.players.length) {
                const me = state.players[humanIdx];
                renderYourCards();
                document.getElementById('my-chips').textContent = me.chips;
                document.getElementById('my-bet').textContent   = me.bet;

                const ev = (me.hand && me.hand.length === 5) ? evaluateHand(me.hand) : null;
                document.getElementById('your-hand-name').textContent = ev ? ev.name : '';
            }

            // Message
            const msg = document.getElementById('fcd-msg');
            msg.className = ''; msg.textContent = '';

            if (state.phase === 'showdown') {
                hideAllActions();
                const winner = state.players.find(p => p.id === state.winner);
                if (winner) {
                    if (humanIdx >= 0 && winner.id === state.players[humanIdx].id) {
                        msg.textContent = 'You win the pot!'; msg.className = 'win';
                    } else {
                        msg.textContent = (winner.name||'?') + ' wins the pot!'; msg.className = 'lose';
                    }
                }
                document.getElementById('next-panel').style.display =
                    (mode === 'sp' || isHost) ? '' : 'none';
            } else {
                document.getElementById('next-panel').style.display = 'none';
                if (humanIdx >= 0 && state.activePlayerIdx === humanIdx &&
                        !state.players[humanIdx].folded) {
                    showMyActions();
                } else if (mode === 'mp') {
                    hideAllActions();
                }
            }
        }

        // ── MP ────────────────────────────────────────────────────────────────
        function mpCreate() {
            if (!window.FIREBASE_READY) { alert('Firebase not available.'); return; }
            isHost = true; mpMyIdx = 0;
            roomId  = Math.random().toString(36).slice(2,8).toUpperCase();
            roomRef = firebase.database().ref('fcdRooms/' + roomId);
            state   = newFCDState([myName]);
            roomRef.set({ host:myName, lobby:[myName], state:JSON.stringify(state), pendingAction:null });
            document.getElementById('mp-room-info').textContent = 'Room: ' + roomId + ' — share with friends';
            document.getElementById('game-panel').style.display = '';
            listenMPRoom();
        }

        function mpJoin() {
            if (!window.FIREBASE_READY) { alert('Firebase not available.'); return; }
            roomId = (document.getElementById('mp-join-id').value||'').toUpperCase();
            if (!roomId) return;
            roomRef = firebase.database().ref('fcdRooms/' + roomId);
            roomRef.once('value', snap => {
                const v = snap.val();
                if (!v) { alert('Room not found.'); return; }
                isHost = (v.host === myName);
                const lobby = v.lobby || [];
                if (!lobby.includes(myName)) {
                    lobby.push(myName);
                    roomRef.child('lobby').set(lobby);
                }
                mpMyIdx = lobby.indexOf(myName);
                document.getElementById('mp-room-info').textContent = 'Joined room: ' + roomId;
                document.getElementById('game-panel').style.display = '';
                listenMPRoom();
            });
        }

        function listenMPRoom() {
            if (!roomRef) return;
            roomRef.child('state').on('value', snap => {
                const raw = snap.val();
                if (!raw) return;
                state = JSON.parse(raw);
                if (mpMyIdx === null)
                    mpMyIdx = state.players.findIndex(p => p.name === myName);
                selectedCards.clear();
                renderState();
            });
            roomRef.child('pendingAction').on('value', snap => {
                if (!isHost || !snap.val()) return;
                const act = snap.val();
                if (!state) return;
                const pidx = state.players.findIndex(p => p.name === act.username);
                if (pidx < 0 || state.activePlayerIdx !== pidx) return;
                if (act.action === 'draw') {
                    state = fcdDraw(state, pidx, act.discards || []);
                } else {
                    state = fcdAction(state, act.action, act.amount || 0);
                }
                pushMPState(state);
                roomRef.child('pendingAction').remove();
            });
            roomRef.child('requestNewHand').on('value', snap => {
                if (!isHost || !snap.val()) return;
                let ns = { ...state, dealerIdx:(state.dealerIdx+1) % state.players.length };
                ns = startFCDHand(ns);
                pushMPState(ns);
                roomRef.child('requestNewHand').remove();
            });
            roomRef.child('lobby').on('value', snap => {
                const lobby = snap.val() || [];
                renderLobby(lobby);
            });
        }

        function pushMPState(s) {
            state = s;
            if (s.phase === 'showdown') maybeUpdateHighScore(s.players.find(p=>p.name===myName)?.chips || 0);
            roomRef.child('state').set(JSON.stringify(s));
        }

        function renderLobby(lobby) {
            const lb = document.getElementById('mp-lobby');
            lb.innerHTML = '<div style="font-family:\'Courier New\',monospace;font-size:10px;color:#555;letter-spacing:1px;margin-bottom:6px;">PLAYERS IN LOBBY:</div>';
            lobby.forEach(name => {
                const d = document.createElement('div');
                d.className = 'lobby-row';
                d.textContent = name + (name === myName ? ' (you)' : '');
                lb.appendChild(d);
            });
            if (isHost && state && state.phase === 'waiting' && lobby.length >= 2) {
                const btn = document.createElement('button');
                btn.className = 'fcd-btn accent';
                btn.style.marginTop = '10px';
                btn.textContent = '▶ Start Hand';
                btn.onclick = () => {
                    const ns = startFCDHand(newFCDState(lobby));
                    pushMPState(ns);
                };
                lb.appendChild(btn);
            }
        }

        // ── High scores ───────────────────────────────────────────────────────
        function maybeUpdateHighScore(chips) {
            if (!window.FIREBASE_READY || !chips) return;
            const ref = firebase.database().ref(FB_HS);
            ref.once('value', snap => {
                const v   = snap.val();
                const cur = (v && Number.isFinite(v.score)) ? v.score : 0;
                if (chips > cur)
                    ref.set({ score:Math.min(chips, 999999), username:String(myName).slice(0,40) });
            });
        }

        if (window.FIREBASE_READY) {
            firebase.database().ref(FB_HS).on('value', snap => {
                const v = snap.val();
                if (!v) return;
                document.getElementById('hs-val').textContent  = Number.isFinite(v.score) ? v.score : '—';
                document.getElementById('hs-user').textContent = typeof v.username === 'string' ? v.username.slice(0,40) : '—';
            });
        }
