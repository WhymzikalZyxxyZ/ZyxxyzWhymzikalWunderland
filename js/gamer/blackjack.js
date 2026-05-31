const myName = (typeof getOrCreateUsername === 'function') ? getOrCreateUsername() : 'Guest';
        const FB_HS  = 'scores/blackjack';
        document.getElementById('user-label').textContent = myName;

        let game = null, mode = 'sp', roomId = null, roomRef = null;

        // ── Card rendering ─────────────────────────────────────────────────────
        function cardEl(card, faceDown) {
            const d = document.createElement('div');
            if (faceDown) { d.className = 'card back'; return d; }
            const red = (card.suit === 'H' || card.suit === 'D');
            d.className = 'card' + (red ? ' red' : '');
            const lbl = rankLabel(card.rank) + suitSymbol(card.suit);
            d.innerHTML = `<span>${lbl}</span><span class="card-b">${lbl}</span>`;
            return d;
        }

        function renderHand(id, hand, hideSecond) {
            const el = document.getElementById(id);
            el.innerHTML = '';
            hand.forEach((c, i) => el.appendChild(cardEl(c, hideSecond && i === 1)));
        }

        // ── Mode switching ──────────────────────────────────────────────────────
        function setMode(m) {
            mode = m;
            document.getElementById('tab-sp').classList.toggle('active', m === 'sp');
            document.getElementById('tab-mp').classList.toggle('active', m === 'mp');
            document.getElementById('sp-setup').style.display = m === 'sp' ? '' : 'none';
            document.getElementById('mp-setup').style.display = m === 'mp' ? '' : 'none';
            document.getElementById('game-panel').style.display = 'none';
        }

        // ── SP ──────────────────────────────────────────────────────────────────
        function spStart() {
            game = newBJGame();
            document.getElementById('game-panel').style.display = '';
            document.getElementById('mp-players').style.display = 'none';
            showPhase('bet');
            updateHUD();
        }

        function doDeal() {
            const bet = Math.max(1, Math.min(game.chips, +document.getElementById('bet-input').value || 20));
            game = bjDeal(game, bet);
            renderHand('dealer-hand', game.dealer, true);
            renderHand('player-hand', game.player, false);
            document.getElementById('dealer-val').textContent = '';
            document.getElementById('player-val').textContent = bjHandValue(game.player);
            document.getElementById('btn-double').disabled = !game.canDouble;
            document.getElementById('bj-msg').textContent = '';
            document.getElementById('bj-msg').className = '';
            updateHUD();
            if (bjIsBlackjack(game.player)) { doStand(); return; }
            showPhase('playing');
        }

        function doHit() {
            game = bjHit(game);
            renderHand('player-hand', game.player, false);
            document.getElementById('player-val').textContent = bjHandValue(game.player);
            if (game.phase === 'result') showResult();
        }

        function doStand() { game = bjStand(game); showResult(); }
        function doDouble() { game = bjDouble(game); renderHand('player-hand', game.player, false); showResult(); }

        function showResult() {
            renderHand('dealer-hand', game.dealer, false);
            document.getElementById('dealer-val').textContent = bjHandValue(game.dealer);
            document.getElementById('player-val').textContent = bjHandValue(game.player);
            const msgs = { blackjack:'Blackjack! 3:2 payout!', win:'You win!', push:'Push — bet returned.', lose:'Bust!' };
            const cls  = { blackjack:'win', win:'win', push:'push', lose:'lose' };
            const msg  = document.getElementById('bj-msg');
            msg.textContent = msgs[game.result] || game.result;
            msg.className   = cls[game.result] || '';
            updateHUD();
            showPhase('result');
            if (mode === 'mp' && roomRef) syncMPResult();
            maybeUpdateHighScore(game.chips);
        }

        function nextHand() {
            if (game.chips <= 0) { game = newBJGame(); }
            document.getElementById('bj-msg').textContent = '';
            document.getElementById('bj-msg').className = '';
            document.getElementById('dealer-hand').innerHTML = '';
            document.getElementById('player-hand').innerHTML = '';
            document.getElementById('dealer-val').textContent = '';
            document.getElementById('player-val').textContent = '';
            document.getElementById('bet-input').max = game.chips;
            showPhase('bet');
            updateHUD();
        }

        function showPhase(ph) {
            document.getElementById('bet-phase').style.display    = ph === 'bet'     ? '' : 'none';
            document.getElementById('play-phase').style.display   = ph === 'playing' ? '' : 'none';
            document.getElementById('result-phase').style.display = ph === 'result'  ? '' : 'none';
        }

        function updateHUD() {
            document.getElementById('chips-display').textContent = game ? game.chips : 0;
            document.getElementById('pot-display').textContent   = game ? game.bet   : 0;
        }

        function quickBet(n) {
            const inp = document.getElementById('bet-input');
            inp.value = Math.min(game.chips, (+inp.value || 0) + n);
        }
        function maxBet() { document.getElementById('bet-input').value = game.chips; }

        // ── MP ─────────────────────────────────────────────────────────────────
        function mpRoomPath(id) { return 'blackjackRooms/' + id; }

        function mpCreate() {
            if (!window.FIREBASE_READY) { alert('Firebase not available.'); return; }
            roomId  = Math.random().toString(36).slice(2,8).toUpperCase();
            roomRef = firebase.database().ref(mpRoomPath(roomId));
            game    = newBJGame();
            roomRef.set({
                host: myName, players: { [myName]: { chips: game.chips, result: null } },
                deck: game.deck, dealer: [], dealerDone: false, phase: 'waiting',
            });
            document.getElementById('mp-room-info').textContent = 'Room: ' + roomId + ' — share this with friends';
            listenMPRoom();
            document.getElementById('game-panel').style.display = '';
            document.getElementById('mp-players').style.display = '';
            showPhase('bet');
            updateHUD();
        }

        function mpJoin() {
            if (!window.FIREBASE_READY) { alert('Firebase not available.'); return; }
            roomId  = (document.getElementById('mp-join-id').value || '').toUpperCase();
            if (!roomId) return;
            roomRef = firebase.database().ref(mpRoomPath(roomId));
            roomRef.once('value', snap => {
                if (!snap.val()) { alert('Room not found.'); return; }
                game = newBJGame();
                roomRef.child('players/' + myName).set({ chips: game.chips, result: null });
                document.getElementById('game-panel').style.display = '';
                document.getElementById('mp-players').style.display = '';
                listenMPRoom();
                showPhase('bet');
                updateHUD();
            });
        }

        function listenMPRoom() {
            if (!roomRef) return;
            roomRef.on('value', snap => {
                const v = snap.val();
                if (!v) return;
                if (v.dealer && v.dealer.length && v.dealerDone) {
                    game.dealer = v.dealer;
                    renderHand('dealer-hand', v.dealer, false);
                    document.getElementById('dealer-val').textContent = bjHandValue(v.dealer);
                }
                // Show all players
                const mp = document.getElementById('mp-players');
                mp.innerHTML = '';
                Object.entries(v.players || {}).forEach(([name, data]) => {
                    const row = document.createElement('div');
                    row.className = 'mp-player-row';
                    row.textContent = name + ': ' + data.chips + ' chips' + (data.result ? ' — ' + data.result : '');
                    mp.appendChild(row);
                });
            });
        }

        function syncMPResult() {
            if (!roomRef || !game) return;
            roomRef.child('players/' + myName).update({ chips: game.chips, result: game.result });
            // If we're the host, run the dealer and broadcast
            roomRef.once('value', snap => {
                const v = snap.val();
                if (v && v.host === myName && !v.dealerDone) {
                    roomRef.update({ dealer: game.dealer, dealerDone: true });
                }
            });
        }

        // ── High scores ──────────────────────────────────────────────────────────
        function maybeUpdateHighScore(chips) {
            if (!window.FIREBASE_READY) return;
            const ref = firebase.database().ref(FB_HS);
            ref.once('value', snap => {
                const v   = snap.val();
                const cur = (v && Number.isFinite(v.score)) ? v.score : 0;
                if (chips > cur) ref.set({ score: Math.min(chips, 999999), username: String(myName).slice(0,40) });
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
