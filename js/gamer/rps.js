const EMOJI  = { rock:'🪨', paper:'📄', scissors:'✂️' };
        const FB_PATH = 'scores/rps';
        const myName  = (typeof getOrCreateUsername === 'function') ? getOrCreateUsername() : 'Guest';
        let history  = [];
        let wins=0, losses=0, draws=0, streak=0, bestStreak=0;
        let difficulty = 3;
        let busy = false;

        document.getElementById('diff-slider').addEventListener('input', function() {
            difficulty = +this.value;
            document.getElementById('diff-val').textContent = this.value;
        });

        function setMode(m) {
            document.getElementById('sp-panel').style.display = m==='sp' ? '' : 'none';
            document.getElementById('mp-panel').style.display = m==='mp' ? '' : 'none';
            document.getElementById('btn-sp').classList.toggle('active', m==='sp');
            document.getElementById('btn-mp').classList.toggle('active', m==='mp');
        }

        function setChoiceBtns(disabled) {
            document.querySelectorAll('.choices .choice-btn').forEach(b => b.disabled = disabled);
        }

        function play(playerChoice) {
            if (busy) return;
            busy = true;
            setChoiceBtns(true);
            const cpuChoice = getComputerChoice(difficulty, history);
            const result    = rpsResult(playerChoice, cpuChoice);
            document.getElementById('your-choice').textContent = EMOJI[playerChoice];
            document.getElementById('cpu-choice').textContent  = EMOJI[cpuChoice];
            history.push(playerChoice);
            if (history.length > 20) history.shift();

            if (result === 'win')  { wins++;   streak++; if (streak > bestStreak) bestStreak = streak; }
            else if (result === 'lose') { losses++; streak = 0; }
            else draws++;

            const msg = result === 'win' ? '🎉 You Win!' : result === 'lose' ? '💀 You Lose…' : '🤝 Draw!';
            document.getElementById('rps-status').textContent = msg;
            document.getElementById('sc-win').textContent    = wins;
            document.getElementById('sc-draw').textContent   = draws;
            document.getElementById('sc-lose').textContent   = losses;
            document.getElementById('sc-streak').textContent = streak;

            maybeUpdateHighScore(bestStreak);

            setTimeout(() => {
                document.getElementById('rps-status').textContent = 'Choose your weapon!';
                setChoiceBtns(false);
                busy = false;
            }, 1200);
        }

        // ── Firebase high score ─────────────────────────────────────────────
        function maybeUpdateHighScore(s) {
            if (!window.FIREBASE_READY) return;
            const ref = firebase.database().ref(FB_PATH);
            ref.once('value', snap => {
                const v = snap.val();
                const current = (v && Number.isFinite(v.score) && v.score >= 0) ? v.score : 0;
                if (s > current) ref.set({ score: Math.min(s, 9999), username: String(myName).slice(0,40) });
            });
        }

        if (window.FIREBASE_READY) {
            firebase.database().ref(FB_PATH).on('value', snap => {
                const v = snap.val();
                if (!v) return;
                const sc = (Number.isFinite(v.score) && v.score >= 0) ? v.score : 0;
                document.getElementById('hs-val').textContent  = sc;
                document.getElementById('hs-user').textContent = typeof v.username === 'string'
                    ? v.username.slice(0,40) : '—';
            });
        }

        // ── Multiplayer (Firebase rooms) ────────────────────────────────────
        const MP_BASE = 'rpsRooms';
        let mpRoomId = null, mpRole = null, mpScoreYou = 0, mpScoreOpp = 0;

        function genRoomId() {
            return Math.random().toString(36).slice(2,8).toUpperCase();
        }

        function createRoom() {
            if (!window.FIREBASE_READY) { alert('Firebase not available.'); return; }
            mpRoomId = genRoomId();
            mpRole   = 'p1';
            const ref = firebase.database().ref(`${MP_BASE}/${mpRoomId}`);
            ref.set({ p1: myName, p2: null, p1Choice: null, p2Choice: null, round: 0 });
            document.getElementById('mp-status').textContent = `Room created. Share code: `;
            document.getElementById('room-code-display').textContent = mpRoomId;
            listenRoom();
        }

        function joinRoom() {
            const code = document.getElementById('join-code').value.trim().toUpperCase().slice(0,6);
            if (!code || !window.FIREBASE_READY) return;
            mpRoomId = code;
            mpRole   = 'p2';
            const ref = firebase.database().ref(`${MP_BASE}/${mpRoomId}`);
            ref.once('value', snap => {
                const d = snap.val();
                if (!d || !d.p1) { document.getElementById('mp-status').textContent = 'Room not found.'; return; }
                ref.update({ p2: myName });
                document.getElementById('mp-status').textContent = `Joined room ${code}`;
                document.getElementById('mp-game').style.display = '';
                listenRoom();
            });
        }

        function mpPlay(choice) {
            if (!mpRoomId || !window.FIREBASE_READY) return;
            const field = mpRole === 'p1' ? 'p1Choice' : 'p2Choice';
            firebase.database().ref(`${MP_BASE}/${mpRoomId}`).update({ [field]: choice });
            document.querySelectorAll('#mp-choices .choice-btn').forEach(b => b.disabled = true);
            document.getElementById('mp-rps-status').textContent = 'Waiting for opponent…';
        }

        function listenRoom() {
            if (!window.FIREBASE_READY) return;
            firebase.database().ref(`${MP_BASE}/${mpRoomId}`).on('value', snap => {
                const d = snap.val();
                if (!d) return;
                if (d.p2 && d.p1) {
                    document.getElementById('mp-game').style.display = '';
                    document.getElementById('mp-status').textContent =
                        `${d.p1} vs ${d.p2}`;
                }
                if (d.p1Choice && d.p2Choice) resolveMpRound(d);
            });
        }

        function resolveMpRound(d) {
            const myChoice  = mpRole === 'p1' ? d.p1Choice : d.p2Choice;
            const oppChoice = mpRole === 'p1' ? d.p2Choice : d.p1Choice;
            if (!RPS_CHOICES.includes(myChoice) || !RPS_CHOICES.includes(oppChoice)) return;
            const res = rpsResult(myChoice, oppChoice);
            document.getElementById('mp-your-choice').textContent = EMOJI[myChoice];
            document.getElementById('mp-opp-choice').textContent  = EMOJI[oppChoice];
            const msg = res === 'win' ? '🎉 You Win!' : res === 'lose' ? '💀 You Lose…' : '🤝 Draw!';
            document.getElementById('mp-rps-status').textContent = msg;
            if (res === 'win')  mpScoreYou++;
            if (res === 'lose') mpScoreOpp++;
            document.getElementById('mp-sc-you').textContent = mpScoreYou;
            document.getElementById('mp-sc-opp').textContent = mpScoreOpp;
            // Reset choices for next round
            setTimeout(() => {
                if (!mpRoomId || !window.FIREBASE_READY) return;
                firebase.database().ref(`${MP_BASE}/${mpRoomId}`)
                    .update({ p1Choice: null, p2Choice: null });
                document.querySelectorAll('#mp-choices .choice-btn').forEach(b => b.disabled = false);
                document.getElementById('mp-rps-status').textContent = 'Choose your weapon!';
                document.getElementById('mp-your-choice').textContent = '❓';
                document.getElementById('mp-opp-choice').textContent  = '❓';
            }, 2000);
        }
