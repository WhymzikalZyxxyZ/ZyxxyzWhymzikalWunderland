/* global getOrCreateUsername, rankLabel, suitSymbol, newPokerState, startPokerHand, pokerAction, getPokerAIAction, evaluateHand, BIG_BLIND */
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

        const myName   = (typeof getOrCreateUsername === 'function') ? getOrCreateUsername() : 'Guest';
        const FB_HS    = 'scores/poker';
        const AI_NAMES = ['Aria','Blake','Casey','Dana','Ellis','Finley','Gray','Harper'];
        const PHASES   = ['preflop','flop','turn','river','showdown'];

        let state = null, mode = 'sp', myIdx = 0;
        let roomId = null, roomRef = null, isHost = false, mpMyIdx = null;
        let aiTimer = null;

        // ── Card rendering ────────────────────────────────────────────────────
        function cardEl(card, faceDown) {
            const d = document.createElement('div');
            if (faceDown) { d.className = 'card back'; return d; }
            if (!card)    { d.className = 'card ghost'; return d; }
            d.className = 'card' + ((card.suit === 'H' || card.suit === 'D') ? ' red' : '');
            const lbl = rankLabel(card.rank) + suitSymbol(card.suit);
            d.innerHTML = `<span>${lbl}</span><span class="card-b">${lbl}</span>`;
            return d;
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
            state = newPokerState([myName, ...AI_NAMES.slice(0, n - 1)]);
            myIdx = 0;
            state = startPokerHand(state);
            document.getElementById('game-panel').style.display = '';
            renderState();
            runAITurns();
        }

        function newHand() {
            if (mode === 'sp') {
                state = { ...state, dealerIdx:(state.dealerIdx + 1) % state.players.length };
                state = startPokerHand(state);
                renderState();
                runAITurns();
            } else if (isHost) {
                let ns = { ...state, dealerIdx:(state.dealerIdx + 1) % state.players.length };
                ns = startPokerHand(ns);
                pushMPState(ns);
            } else {
                roomRef && roomRef.child('requestNewHand').set(myName);
            }
        }

        function doAction(action, amount) {
            if (!state || state.phase === 'showdown') return;
            const humanIdx = mode === 'sp' ? myIdx : mpMyIdx;
            if (state.activePlayerIdx !== humanIdx) return;
            if (mode === 'sp') {
                state = pokerAction(state, action, amount);
                renderState();
                if (state.phase !== 'showdown') runAITurns();
                else onShowdown();
            } else {
                if (isHost) {
                    state = pokerAction(state, action, amount);
                    pushMPState(state);
                } else {
                    roomRef.child('pendingAction').set({ username:myName, action, amount:amount||0, ts:Date.now() });
                }
            }
        }

        function goAllIn() {
            const humanIdx = mode === 'sp' ? myIdx : mpMyIdx;
            if (state && humanIdx !== null) {
                document.getElementById('raise-input').value = state.players[humanIdx].chips;
            }
        }

        function runAITurns() {
            clearTimeout(aiTimer);
            if (!state || state.phase === 'showdown' || state.phase === 'waiting') return;
            if (state.activePlayerIdx === myIdx) { enableActions(true); return; }
            enableActions(false);
            aiTimer = setTimeout(() => {
                if (!state || state.activePlayerIdx === myIdx) return;
                const ai = getPokerAIAction(state, state.activePlayerIdx);
                state = pokerAction(state, ai.action, ai.amount);
                renderState();
                if (state.phase === 'showdown') onShowdown();
                else runAITurns();
            }, 700);
        }

        function onShowdown() {
            if (mode === 'sp') maybeUpdateHighScore(state.players[myIdx].chips);
        }

        // ── Render ────────────────────────────────────────────────────────────
        function renderState() {
            if (!state) return;
            const humanIdx = mode === 'sp' ? myIdx : (mpMyIdx !== null ? mpMyIdx : -1);
            const phIdx = PHASES.indexOf(state.phase);

            document.getElementById('phase-label').textContent = (state.phase || '').replace(/^\w/, c=>c.toUpperCase());
            const dealer = state.players[state.dealerIdx];
            document.getElementById('dealer-label').textContent = dealer ? '[Dealer: '+dealer.name+']' : '';

            PHASES.forEach((ph, i) => {
                const el = document.getElementById('ph-' + ph);
                el.className = 'phase-step' +
                    (i < phIdx ? ' done' : i === phIdx ? ' active' : '');
            });

            document.getElementById('pot-val').textContent = state.pot;
            document.getElementById('bet-val').textContent = state.currentBet;

            // Community cards
            const comm = document.getElementById('community');
            comm.innerHTML = '';
            for (let i = 0; i < 5; i++) {
                const c = state.community[i];
                const el = c ? cardEl(c, false) : (() => { const d=document.createElement('div'); d.className='card ghost'; return d; })();
                comm.appendChild(el);
            }

            // Win/result map
            const winnerId = state.winner;
            const hrMap = {};
            (state.handResults||[]).forEach(hr => hrMap[hr.id] = hr.eval);

            // Players grid (excluding human)
            const grid = document.getElementById('players-grid');
            grid.innerHTML = '';
            state.players.forEach((p, i) => {
                if (i === humanIdx) return;
                const seat = document.createElement('div');
                const isActive  = state.activePlayerIdx === i && state.phase !== 'showdown';
                const isWinner  = p.id === winnerId;
                seat.className = 'player-seat' +
                    (isActive  ? ' active'  : '') +
                    (p.folded  ? ' folded'  : '') +
                    (isWinner  ? ' winner'  : '');

                const showCards = state.phase === 'showdown' && !p.folded;
                const cardsDiv = document.createElement('div');
                cardsDiv.className = 'seat-cards';
                if (showCards) {
                    (p.hand||[]).forEach(c => cardsDiv.appendChild(cardEl(c, false)));
                } else if (p.hand && p.hand.length) {
                    p.hand.forEach(() => cardsDiv.appendChild(cardEl(null, true)));
                }

                const status = p.folded ? 'FOLDED' : p.allIn ? 'ALL-IN' :
                    (isActive ? 'THINKING…' : '');
                const handName = (showCards && hrMap[p.id]) ? hrMap[p.id].name : '';

                seat.innerHTML = `
                    <div class="seat-name">${escHtml(p.name)}${isWinner?' ★':''}</div>
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
                const yourCards = document.getElementById('your-cards');
                yourCards.innerHTML = '';
                (me.hand||[]).forEach(c => yourCards.appendChild(cardEl(c, false)));
                document.getElementById('my-chips').textContent = me.chips;
                document.getElementById('my-bet').textContent   = me.bet;

                let handName = '';
                if (state.community.length >= 3 && me.hand.length >= 2) {
                    const ev = evaluateHand([...me.hand, ...state.community]);
                    if (ev) handName = ev.name;
                }
                document.getElementById('your-hand-name').textContent = handName;

                const toCall = state.currentBet - me.bet;
                document.getElementById('btn-call').textContent  = toCall > 0 ? `Call $${toCall}` : 'Call';
                document.getElementById('btn-call').disabled     = toCall === 0 || me.folded;
                document.getElementById('btn-check').disabled    = toCall > 0 || me.folded;
                document.getElementById('raise-input').min       = Math.max(BIG_BLIND, state.currentBet - me.bet + BIG_BLIND);
            }

            // Message + next-hand
            const msg = document.getElementById('pk-msg');
            msg.className = '';
            msg.textContent = '';

            if (state.phase === 'showdown') {
                enableActions(false);
                const winner = state.players.find(p => p.id === state.winner);
                if (winner) {
                    if (humanIdx >= 0 && winner.id === state.players[humanIdx].id) {
                        msg.textContent = 'You win the pot!'; msg.className = 'win';
                    } else {
                        msg.textContent = (winner.name || '?') + ' wins the pot!'; msg.className = 'lose';
                    }
                }
                // Only show next-hand in SP, or if host in MP
                document.getElementById('next-panel').style.display =
                    (mode === 'sp' || isHost) ? '' : 'none';
                document.getElementById('btn-next-hand').style.display = '';
            } else {
                document.getElementById('next-panel').style.display = 'none';
                if (humanIdx >= 0 && state.activePlayerIdx === humanIdx && !state.players[humanIdx].folded) {
                    enableActions(true);
                } else if (mode === 'mp') {
                    enableActions(false);
                }
            }
        }

        function enableActions(on) {
            document.getElementById('action-panel').style.display = on ? '' : 'none';
        }

        // ── MP ────────────────────────────────────────────────────────────────
        function mpCreate() {
            if (!window.FIREBASE_READY) { alert('Firebase not available.'); return; }
            isHost  = true; mpMyIdx = 0;
            roomId  = Math.random().toString(36).slice(2,8).toUpperCase();
            roomRef = firebase.database().ref('pokerRooms/' + roomId);
            state   = newPokerState([myName]);
            roomRef.set({ host:myName, lobby:[myName], state:JSON.stringify(state), pendingAction:null, requestNewHand:null });
            document.getElementById('mp-room-info').textContent = 'Room: ' + roomId + ' — share with friends';
            document.getElementById('game-panel').style.display = '';
            listenMPRoom();
        }

        function mpJoin() {
            if (!window.FIREBASE_READY) { alert('Firebase not available.'); return; }
            roomId = (document.getElementById('mp-join-id').value||'').toUpperCase();
            if (!roomId) return;
            roomRef = firebase.database().ref('pokerRooms/' + roomId);
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
                if (mpMyIdx === null) {
                    mpMyIdx = state.players.findIndex(p => p.name === myName);
                }
                renderState();
            });
            roomRef.child('pendingAction').on('value', snap => {
                if (!isHost || !snap.val()) return;
                const act = snap.val();
                if (!state) return;
                const pidx = state.players.findIndex(p => p.name === act.username);
                if (pidx < 0 || state.activePlayerIdx !== pidx) return;
                state = pokerAction(state, act.action, act.amount || 0);
                pushMPState(state);
                roomRef.child('pendingAction').remove();
            });
            roomRef.child('requestNewHand').on('value', snap => {
                if (!isHost || !snap.val()) return;
                let ns = { ...state, dealerIdx:(state.dealerIdx+1) % state.players.length };
                ns = startPokerHand(ns);
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
                btn.className = 'pk-btn accent';
                btn.style.marginTop = '10px';
                btn.textContent = '▶ Start Hand';
                btn.onclick = () => {
                    const ns = startPokerHand(newPokerState(lobby));
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
