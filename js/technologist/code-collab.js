'use strict';

    // --- OT core (simplified, text only) ---
    function otTransformInsertInsert(opA, opB) {
        // Transform opB against opA (both inserts, concurrent)
        if (opA.pos <= opB.pos) {
            return { ...opB, pos: opB.pos + opA.text.length };
        }
        return opB;
    }
    function otTransformDeleteInsert(opDel, opIns) {
        // Transform delete against prior insert
        if (opIns.pos <= opDel.pos) {
            return { ...opDel, pos: opDel.pos + opIns.text.length };
        }
        return opDel;
    }
    function otTransformInsertDelete(opIns, opDel) {
        if (opDel.pos < opIns.pos) {
            return { ...opIns, pos: Math.max(opDel.pos, opIns.pos - opDel.count) };
        }
        return opIns;
    }
    function applyOp(text, op) {
        if (op.type === 'insert') {
            return text.slice(0, op.pos) + op.text + text.slice(op.pos);
        } else if (op.type === 'delete') {
            return text.slice(0, op.pos) + text.slice(op.pos + op.count);
        }
        return text;
    }

    // --- Live Editor ---
    const INITIAL_DOC = `function greet(name) {\n    return "Hello, " + name;\n}\n\nconsole.log(greet("World"));`;
    let docState = INITIAL_DOC;
    let aliceVersion = INITIAL_DOC;
    let bobVersion = INITIAL_DOC;
    let otLogLines = [];
    let syncTimerAlice = null;
    let syncTimerBob = null;

    function resetDoc() {
        docState = INITIAL_DOC;
        aliceVersion = INITIAL_DOC;
        bobVersion = INITIAL_DOC;
        document.getElementById('editorAlice').value = INITIAL_DOC;
        document.getElementById('editorBob').value = INITIAL_DOC;
        document.getElementById('mergedDoc').textContent = INITIAL_DOC;
        clearLog();
    }

    function clearLog() {
        otLogLines = [];
        document.getElementById('otLog').innerHTML = '<div class="ot-op"><span class="ot-desc" style="color:#444;">Waiting for edits...</span></div>';
    }

    function addOtLog(actor, desc, cls) {
        const el = document.getElementById('otLog');
        if (el.querySelector('.ot-op span[style]')) el.innerHTML = '';
        const line = document.createElement('div');
        line.className = 'ot-op';
        line.innerHTML = `<span class="ot-actor ${actor}">${actor === 'alice' ? 'Alice' : 'Bob'}</span><span class="ot-desc ${cls||''}">${desc}</span>`;
        el.appendChild(line);
        el.scrollTop = el.scrollHeight;
    }

    function diffStrings(oldStr, newStr) {
        // Find first difference
        let i = 0;
        while (i < oldStr.length && i < newStr.length && oldStr[i] === newStr[i]) i++;
        if (i === oldStr.length && i === newStr.length) return null;
        // Check if insert or delete
        if (newStr.length > oldStr.length) {
            const ins = newStr.slice(i, i + (newStr.length - oldStr.length));
            return { type: 'insert', pos: i, text: ins };
        } else if (newStr.length < oldStr.length) {
            const count = oldStr.length - newStr.length;
            return { type: 'delete', pos: i, count };
        }
        return { type: 'replace', pos: i, text: newStr.slice(i) };
    }

    function setupLiveEditors() {
        const edA = document.getElementById('editorAlice');
        const edB = document.getElementById('editorBob');
        edA.value = INITIAL_DOC;
        edB.value = INITIAL_DOC;
        document.getElementById('mergedDoc').textContent = INITIAL_DOC;

        function handleChange(actor, editor, otherEditor, statusId, _otherStatusId) {
            const delay = parseInt(document.getElementById('syncDelay').value) || 400;
            const newText = editor.value;
            const op = diffStrings(actor === 'alice' ? aliceVersion : bobVersion, newText);

            if (actor === 'alice') aliceVersion = newText;
            else bobVersion = newText;

            document.getElementById(statusId).textContent = 'Typing...';
            document.getElementById(statusId).className = 'editor-status typing';

            if (op) {
                if (op.type === 'insert') {
                    addOtLog(actor, `insert "${op.text.replace(/\n/g,'↵')}" at pos ${op.pos}`);
                } else if (op.type === 'delete') {
                    addOtLog(actor, `delete ${op.count} char(s) at pos ${op.pos}`);
                }
            }

            clearTimeout(actor === 'alice' ? syncTimerAlice : syncTimerBob);
            const timer = setTimeout(() => {
                // Sync: the other editor gets the change, transformed
                const otherText = otherEditor.value;
                if (op) {
                    let transformedOp = op;
                    const otherOp = diffStrings(docState, otherText);
                    if (otherOp && otherOp.type === 'insert' && op.type === 'insert') {
                        transformedOp = otTransformInsertInsert(otherOp, op);
                        addOtLog(actor, `→ transformed pos ${op.pos} → ${transformedOp.pos} (other inserted "${otherOp.text.replace(/\n/g,'↵')}" at ${otherOp.pos})`, 'ot-resolve');
                    }
                    const merged = applyOp(otherText, transformedOp);
                    otherEditor.value = merged;
                    if (actor === 'alice') bobVersion = merged;
                    else aliceVersion = merged;
                    docState = merged;
                    document.getElementById('mergedDoc').textContent = merged;
                } else {
                    docState = newText;
                    otherEditor.value = newText;
                    if (actor === 'alice') bobVersion = newText;
                    else aliceVersion = newText;
                    document.getElementById('mergedDoc').textContent = newText;
                }

                document.getElementById(statusId).textContent = 'Synced ✓';
                document.getElementById(statusId).className = 'editor-status';
                addOtLog(actor, 'sync complete', 'ot-resolve');
            }, delay);

            if (actor === 'alice') syncTimerAlice = timer;
            else syncTimerBob = timer;
        }

        edA.addEventListener('input', () => handleChange('alice', edA, edB, 'statusAlice', 'statusBob'));
        edB.addEventListener('input', () => handleChange('bob', edB, edA, 'statusBob', 'statusAlice'));
    }

    // --- Scenarios ---
    const SCENARIOS = [
        {
            id: 'ins-ins-after',
            title: 'Concurrent Inserts (non-overlapping)',
            desc: 'Alice inserts at end; Bob inserts in middle. Positions must be adjusted.',
            initial: 'hello world',
            aliceOp: { type: 'insert', pos: 11, text: '!' },
            bobOp:   { type: 'insert', pos: 5,  text: ' big' },
        },
        {
            id: 'ins-ins-same',
            title: 'Concurrent Inserts (same position)',
            desc: 'Both insert at position 5. Tie-breaking by alphabetical actor name.',
            initial: 'hello world',
            aliceOp: { type: 'insert', pos: 5, text: ' beautiful' },
            bobOp:   { type: 'insert', pos: 5, text: ' wonderful' },
        },
        {
            id: 'del-ins',
            title: 'Delete vs Insert',
            desc: 'Alice deletes a word; Bob inserts before the deleted range.',
            initial: 'the quick brown fox',
            aliceOp: { type: 'delete', pos: 10, count: 6 },
            bobOp:   { type: 'insert', pos: 4,  text: 'very ' },
        },
        {
            id: 'ins-del-overlap',
            title: 'Insert into Deleted Range',
            desc: 'Bob inserts inside a range that Alice concurrently deleted.',
            initial: 'foobar baz',
            aliceOp: { type: 'delete', pos: 0, count: 6 },
            bobOp:   { type: 'insert', pos: 3, text: 'XYZ' },
        },
    ];

    let selectedScenario = null;
    let simStep = 0;
    let simSteps = [];

    function renderScenarios() {
        const grid = document.getElementById('scenarioGrid');
        grid.innerHTML = SCENARIOS.map(s => `
            <div class="scenario-card" id="sc-${s.id}" onclick="selectScenario('${s.id}')">
                <h4>${s.title}</h4>
                <p>${s.desc}</p>
            </div>
        `).join('');
    }

    function selectScenario(id) {
        selectedScenario = SCENARIOS.find(s => s.id === id);
        document.querySelectorAll('.scenario-card').forEach(c => c.classList.remove('selected'));
        document.getElementById('sc-' + id).classList.add('selected');

        const s = selectedScenario;
        document.getElementById('simAliceOp').innerHTML =
            `<div style="color:#666;margin-bottom:6px;">Initial: <span style="color:#ccc;">"${s.initial}"</span></div>` +
            `<div style="color:var(--alice);">Alice: ${describeOp(s.aliceOp)}</div>`;
        document.getElementById('simBobOp').innerHTML =
            `<div style="color:#666;margin-bottom:6px;">Initial: <span style="color:#ccc;">"${s.initial}"</span></div>` +
            `<div style="color:var(--bob);">Bob: ${describeOp(s.bobOp)}</div>`;

        document.getElementById('simLog').innerHTML = '';
        document.getElementById('simResult').textContent = '—';
        document.getElementById('scenarioDetail').style.display = 'block';
        simStep = 0;
        buildSimSteps(s);
    }

    function describeOp(op) {
        if (op.type === 'insert') return `insert "${op.text}" at pos ${op.pos}`;
        if (op.type === 'delete') return `delete ${op.count} char(s) at pos ${op.pos}`;
        return JSON.stringify(op);
    }

    function buildSimSteps(s) {
        simSteps = [];
        const initial = s.initial;
        const aliceOp = s.aliceOp;
        const bobOp = s.bobOp;

        simSteps.push({ actor: null, desc: `Initial document: "<strong>${initial}</strong>"`, cls: 'log-info' });
        simSteps.push({ actor: 'alice', desc: `Applies: ${describeOp(aliceOp)}`, cls: '' });
        simSteps.push({ actor: 'bob',   desc: `Applies (concurrent): ${describeOp(bobOp)}`, cls: '' });

        const afterAlice = applyOp(initial, aliceOp);
        const afterBob   = applyOp(initial, bobOp);
        simSteps.push({ actor: 'alice', desc: `Alice's doc: "<strong>${afterAlice}</strong>"`, cls: 'ot-resolve' });
        simSteps.push({ actor: 'bob',   desc: `Bob's doc: "<strong>${afterBob}</strong>"`, cls: 'ot-resolve' });

        // Server receives Alice first, transforms Bob's op
        let bobTransformed;
        if (aliceOp.type === 'insert' && bobOp.type === 'insert') {
            bobTransformed = otTransformInsertInsert(aliceOp, bobOp);
            if (bobTransformed.pos !== bobOp.pos) {
                simSteps.push({ actor: null, desc: `<span class="ot-conflict">⚠ Conflict detected — positions overlap</span>`, cls: '' });
                simSteps.push({ actor: null, desc: `Transform: Bob's pos ${bobOp.pos} → ${bobTransformed.pos} (shift by +${aliceOp.text.length} for Alice's insert)`, cls: 'ot-resolve' });
            } else if (bobOp.pos === aliceOp.pos) {
                // Tie-break: Alice wins (alphabetical)
                bobTransformed = { ...bobOp, pos: bobOp.pos + aliceOp.text.length };
                simSteps.push({ actor: null, desc: `<span class="ot-conflict">⚠ Same position — tie-break: Alice (alphabetically first) goes first</span>`, cls: '' });
                simSteps.push({ actor: null, desc: `Transform: Bob's pos ${bobOp.pos} → ${bobTransformed.pos}`, cls: 'ot-resolve' });
            } else {
                simSteps.push({ actor: null, desc: `No position conflict — Bob's op applied as-is`, cls: 'ot-resolve' });
            }
        } else if (aliceOp.type === 'delete' && bobOp.type === 'insert') {
            bobTransformed = otTransformDeleteInsert(aliceOp, bobOp);
            if (bobOp.pos !== bobTransformed.pos) {
                simSteps.push({ actor: null, desc: `Transform: Bob's insert shifts pos ${bobOp.pos} → ${bobTransformed.pos}`, cls: 'ot-resolve' });
            } else {
                simSteps.push({ actor: null, desc: `Bob's insert is outside deleted range — no transform needed`, cls: 'ot-resolve' });
            }
        } else if (aliceOp.type === 'insert' && bobOp.type === 'delete') {
            bobTransformed = otTransformInsertDelete(aliceOp, bobOp);
        } else {
            bobTransformed = bobOp;
        }

        const finalDoc = applyOp(afterAlice, bobTransformed);
        simSteps.push({ actor: null, desc: `Apply transformed Bob op to Alice's doc`, cls: '' });
        simSteps.push({ actor: null, desc: `✓ Converged: "<strong>${finalDoc}</strong>"`, cls: 'ot-resolve', final: finalDoc });
    }

    let simRunning = false;
    async function runScenario() {
        if (simRunning) return;
        if (!selectedScenario) return;
        simRunning = true;
        document.getElementById('simLog').innerHTML = '';
        document.getElementById('simResult').textContent = '—';

        for (const step of simSteps) {
            await new Promise(r => setTimeout(r, 520));
            const el = document.getElementById('simLog');
            const div = document.createElement('div');
            div.className = 'ot-op';
            if (step.actor) {
                div.innerHTML = `<span class="ot-actor ${step.actor}">${step.actor === 'alice' ? 'Alice' : 'Bob'}</span><span class="ot-desc ${step.cls||''}">${step.desc}</span>`;
            } else {
                div.innerHTML = `<span class="ot-desc ${step.cls||''}" style="padding-left:60px;">${step.desc}</span>`;
            }
            el.appendChild(div);
            el.scrollTop = el.scrollHeight;
            if (step.final) document.getElementById('simResult').textContent = step.final;
        }
        simRunning = false;
    }

    // --- Tab switch ---
    function switchTab(name) {
        document.querySelectorAll('.cc-tab').forEach((t, i) => {
            const tabs = ['editor','simulate','concepts'];
            t.classList.toggle('active', tabs[i] === name);
        });
        document.querySelectorAll('.cc-panel').forEach(p => p.classList.remove('active'));
        document.getElementById('tab-' + name).classList.add('active');
    }

    renderScenarios();
    setupLiveEditors();
