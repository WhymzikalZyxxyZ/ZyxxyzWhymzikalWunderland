/* global getOrCreateUsername, rankLabel, suitSymbol, wasteToFoundation, tableauToFoundation, wasteToTableau, tableauToTableau, drawFromStock, calcSolitaireScore, newSolitaireGame, shuffle, createDeck */
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

        const myName = (typeof getOrCreateUsername === 'function') ? getOrCreateUsername() : 'Guest';
        const FB_HS  = 'scores/solitaire';
        document.getElementById('user-label') && (document.getElementById('user-label').textContent = myName);

        let game = null, timerInterval = null, elapsed = 0;
        let selection = null; // { source:'waste'|'tableau', col:?, idx:? }
        let mode = 'sp', roomId = null, roomRef = null;

        // ── Card rendering ──────────────────────────────────────────────────────
        function cardEl(card, faceDown, extraClass) {
            const d = document.createElement('div');
            if (faceDown) { d.className = 'card back'; return d; }
            const red = card.suit === 'H' || card.suit === 'D';
            d.className = 'card' + (red ? ' red' : '') + (extraClass ? ' ' + extraClass : '');
            const lbl = rankLabel(card.rank) + suitSymbol(card.suit);
            d.innerHTML = `<span>${lbl}</span><span class="card-b">${lbl}</span>`;
            return d;
        }

        function emptySlot(label) {
            const d = document.createElement('div');
            d.className = 'card empty-slot';
            d.innerHTML = `<span style="color:#444;font-size:9px;letter-spacing:1px;">${label}</span>`;
            return d;
        }

        // ── Full render ─────────────────────────────────────────────────────────
        function render() {
            if (!game) return;
            // Stock
            const stockEl = document.getElementById('stock-slot');
            stockEl.innerHTML = '';
            if (game.stock.length) {
                stockEl.appendChild(cardEl({ suit:'S', rank:2 }, true));
            } else {
                const e = emptySlot('↺');
                e.style.cursor = 'pointer';
                stockEl.appendChild(e);
            }

            // Waste
            const wasteEl = document.getElementById('waste-slot');
            wasteEl.innerHTML = '';
            if (game.waste.length) {
                const top = game.waste[game.waste.length - 1];
                const c   = cardEl(top, false, selection && selection.source === 'waste' ? 'selected' : '');
                c.onclick = () => selectWaste();
                wasteEl.appendChild(c);
            } else {
                wasteEl.appendChild(emptySlot(''));
            }

            // Foundations
            ['S','H','D','C'].forEach(suit => {
                const el  = document.getElementById('found-' + suit);
                el.innerHTML = '';
                const top = game.foundations[suit];
                if (top > 0) {
                    el.appendChild(cardEl({ suit, rank: top }, false));
                } else {
                    el.appendChild(emptySlot(suitSymbol(suit)));
                }
            });

            // Tableau
            const tabEl = document.getElementById('tableau');
            tabEl.innerHTML = '';
            game.tableau.forEach((col, ci) => {
                const colEl = document.createElement('div');
                colEl.className = 'col';
                if (col.length === 0) {
                    const e = emptySlot('K');
                    e.onclick = () => dropOnTableau(ci);
                    colEl.appendChild(e);
                } else {
                    col.forEach((card, ri) => {
                        const isSel = selection && selection.source === 'tableau'
                            && selection.col === ci && ri >= selection.idx;
                        const c = cardEl(card, !card.faceUp, isSel ? 'selected' : '');
                        if (card.faceUp) {
                            c.onclick = () => clickTableau(ci, ri);
                        }
                        colEl.appendChild(c);
                    });
                }
                tabEl.appendChild(colEl);
            });

            document.getElementById('sol-moves').textContent = game.moves + ' moves';
        }

        // ── Selection & moves ───────────────────────────────────────────────────
        function selectWaste() {
            if (!game.waste.length) return;
            if (selection && selection.source === 'waste') { selection = null; render(); return; }
            selection = { source: 'waste' };
            render();
        }

        function clickTableau(col, idx) {
            const card = game.tableau[col][idx];
            if (!card.faceUp) return;
            if (selection) {
                dropOnTableau(col);
            } else {
                selection = { source: 'tableau', col, idx };
                render();
            }
        }

        function doClickFoundation(suit) {
            if (!selection) return;
            let next;
            if (selection.source === 'waste')
                next = wasteToFoundation(game);
            else if (selection.source === 'tableau' && selection.idx === game.tableau[selection.col].length - 1)
                next = tableauToFoundation(game, selection.col);
            else { selection = null; render(); return; }
            if (next !== game) { game = next; selection = null; checkSolved(); render(); }
        }

        function dropOnTableau(col) {
            if (!selection) return;
            let next;
            if (selection.source === 'waste')
                next = wasteToTableau(game, col);
            else
                next = tableauToTableau(game, selection.col, selection.idx, col);
            if (next !== game) { game = next; selection = null; checkSolved(); render(); }
            else { selection = null; render(); }
        }

        function doDrawStock() {
            selection = null;
            game = drawFromStock(game);
            render();
        }

        function autoFoundation() {
            // Keep moving cards to foundation as long as possible
            let changed = true;
            while (changed) {
                changed = false;
                let next = wasteToFoundation(game);
                if (next !== game) { game = next; changed = true; continue; }
                for (let i = 0; i < 7; i++) {
                    next = tableauToFoundation(game, i);
                    if (next !== game) { game = next; changed = true; break; }
                }
            }
            selection = null;
            checkSolved();
            render();
        }

        function checkSolved() {
            if (!game.solved) return;
            clearInterval(timerInterval);
            document.getElementById('sol-msg').textContent = '🎉 Solved in ' + fmtTime(elapsed) + '!';
            const score = calcSolitaireScore(game.moves, elapsed);
            maybeUpdateHighScore(score);
            if (mode === 'mp' && roomRef) {
                roomRef.child('players/' + myName).update({ solved: true, time: elapsed, moves: game.moves });
            }
        }

        // ── Timer ───────────────────────────────────────────────────────────────
        function startTimer() {
            clearInterval(timerInterval);
            elapsed = 0;
            timerInterval = setInterval(() => {
                elapsed++;
                document.getElementById('sol-timer').textContent = fmtTime(elapsed);
            }, 1000);
        }

        function fmtTime(s) {
            return Math.floor(s/60) + ':' + String(s%60).padStart(2,'0');
        }

        // ── SP ──────────────────────────────────────────────────────────────────
        function setMode(m) {
            mode = m;
            document.getElementById('tab-sp').classList.toggle('active', m === 'sp');
            document.getElementById('tab-mp').classList.toggle('active', m === 'mp');
            document.getElementById('sp-setup').style.display = m === 'sp' ? '' : 'none';
            document.getElementById('mp-setup').style.display = m === 'mp' ? '' : 'none';
        }

        function spStart() {
            game = newSolitaireGame();
            selection = null;
            document.getElementById('game-panel').style.display = '';
            document.getElementById('sol-msg').textContent = '';
            startTimer();
            render();
        }

        function restartGame() {
            if (!game) return;
            spStart();
        }

        // ── MP Race ─────────────────────────────────────────────────────────────
        function mpRoomPath(id) { return 'solitaireRooms/' + id; }

        function mpCreate() {
            if (!window.FIREBASE_READY) { alert('Firebase not available.'); return; }
            roomId  = Math.random().toString(36).slice(2,8).toUpperCase();
            roomRef = firebase.database().ref(mpRoomPath(roomId));
            // Shuffle and share deck so all players race the same layout
            const sharedDeck = shuffle(createDeck());
            game = newSolitaireGame(sharedDeck);
            roomRef.set({ host: myName, deck: sharedDeck, started: true,
                          players: { [myName]: { solved: false } } });
            document.getElementById('mp-room-info').textContent = 'Room: ' + roomId + ' — share with friends';
            listenMPRoom();
            document.getElementById('game-panel').style.display = '';
            document.getElementById('sol-msg').textContent = '';
            selection = null;
            startTimer();
            render();
        }

        function mpJoin() {
            if (!window.FIREBASE_READY) { alert('Firebase not available.'); return; }
            roomId  = (document.getElementById('mp-join-id').value || '').toUpperCase();
            if (!roomId) return;
            roomRef = firebase.database().ref(mpRoomPath(roomId));
            roomRef.once('value', snap => {
                const v = snap.val();
                if (!v) { alert('Room not found.'); return; }
                game = newSolitaireGame(Object.values(v.deck));
                roomRef.child('players/' + myName).set({ solved: false });
                listenMPRoom();
                document.getElementById('game-panel').style.display = '';
                document.getElementById('sol-msg').textContent = '';
                selection = null;
                startTimer();
                render();
            });
        }

        function listenMPRoom() {
            if (!roomRef) return;
            roomRef.child('players').on('value', snap => {
                const players = snap.val() || {};
                const list    = document.getElementById('mp-players-list');
                list.innerHTML = Object.entries(players).map(([name, data]) =>
                    escHtml(name) + ': ' + (data.solved ? '✓ solved in ' + fmtTime(data.time || 0) + ' ('+data.moves+' moves)' : 'playing…')
                ).join('<br>');
            });
        }

        // ── High score ──────────────────────────────────────────────────────────
        function maybeUpdateHighScore(score) {
            if (!window.FIREBASE_READY) return;
            const ref = firebase.database().ref(FB_HS);
            ref.once('value', snap => {
                const v   = snap.val();
                const cur = (v && Number.isFinite(v.score)) ? v.score : 0;
                if (score > cur) ref.set({ score: Math.min(score, 999999), username: String(myName).slice(0,40) });
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
