'use strict';

    let stages = [];
    let jobs = {};
    let runInterval = null;
    let runState = null;
    let _history = [];
    let runCount = 0;
    let allDurations = {};

    const STAGE_COLORS = {
        '#6eb5ff': '#000', '#56c98a': '#000', '#f4a261': '#000',
        '#c9a0e8': '#000', '#ef5350': '#fff', '#ffd580': '#000'
    };

    function switchTab(name) {
        document.querySelectorAll('.pl-tab').forEach((t, i) => {
            const tabs = ['build','run','metrics','concepts'];
            t.classList.toggle('active', tabs[i] === name);
        });
        document.querySelectorAll('.pl-panel').forEach(p => p.classList.remove('active'));
        document.getElementById('tab-' + name).classList.add('active');
        if (name === 'run') renderRunVis();
        if (name === 'metrics') renderMetrics();
    }

    function addStage() {
        const name = document.getElementById('stageName').value.trim();
        if (!name) return;
        if (stages.find(s => s.name === name)) { alert('Stage already exists'); return; }
        const color = document.getElementById('stageColor').value;
        stages.push({ name, color });
        jobs[name] = [];
        document.getElementById('stageName').value = '';
        renderAll();
    }

    function removeStage(name) {
        stages = stages.filter(s => s.name !== name);
        delete jobs[name];
        renderAll();
    }

    function addJob() {
        const stageName = document.getElementById('jobStage').value;
        const name = document.getElementById('jobName').value.trim();
        const duration = parseInt(document.getElementById('jobDuration').value) || 1200;
        const failRate = parseInt(document.getElementById('jobFailRate').value) || 0;
        if (!stageName || !name) return;
        jobs[stageName] = jobs[stageName] || [];
        jobs[stageName].push({ name, duration, failRate });
        document.getElementById('jobName').value = '';
        renderAll();
    }

    function renderAll() {
        renderStageList();
        renderJobStageSelect();
        renderBuildVis();
    }

    function renderStageList() {
        const el = document.getElementById('stageList');
        if (!stages.length) { el.innerHTML = '<span style="color:#444;font-size:0.82rem;">No stages yet.</span>'; return; }
        el.innerHTML = stages.map(s => `
            <div class="stage-chip">
                <span style="color:${s.color};">&#9632;</span>
                <span style="flex:1;margin-left:8px;">${s.name}</span>
                <span style="color:#555;font-size:0.75rem;margin-right:8px;">${(jobs[s.name]||[]).length} jobs</span>
                <button onclick="removeStage('${s.name}')" title="Remove stage">&times;</button>
            </div>
        `).join('');
    }

    function renderJobStageSelect() {
        const sel = document.getElementById('jobStage');
        sel.innerHTML = stages.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
    }

    function renderBuildVis() {
        const vis = document.getElementById('pipelineVis');
        const empty = document.getElementById('emptyMsg');
        if (!stages.length) { vis.innerHTML = ''; empty.style.display = 'block'; return; }
        empty.style.display = 'none';
        vis.innerHTML = stages.map((s, i) => `
            ${i > 0 ? '<div class="stage-connector"></div>' : ''}
            <div class="stage-col">
                <div class="stage-header" style="background:${s.color};color:${STAGE_COLORS[s.color]||'#000'}">${s.name}</div>
                ${(jobs[s.name]||[]).map(j => `
                    <div class="job-card status-idle">
                        <div class="job-name"><span class="job-status-dot"></span>${j.name}</div>
                        <div class="job-meta">${j.duration}ms &bull; ${j.failRate}% fail</div>
                    </div>
                `).join('')}
                ${!(jobs[s.name]||[]).length ? '<div style="color:#333;font-size:0.78rem;padding:8px 0;">No jobs</div>' : ''}
            </div>
        `).join('');
    }

    function renderRunVis(statuses) {
        const vis = document.getElementById('runVis');
        const empty = document.getElementById('runEmptyMsg');
        if (!stages.length) { vis.innerHTML = ''; empty.style.display = 'block'; return; }
        empty.style.display = 'none';
        vis.innerHTML = stages.map((s, i) => `
            ${i > 0 ? '<div class="stage-connector"></div>' : ''}
            <div class="stage-col">
                <div class="stage-header" style="background:${s.color};color:${STAGE_COLORS[s.color]||'#000'}">${s.name}</div>
                ${(jobs[s.name]||[]).map(j => {
                    const key = s.name + '/' + j.name;
                    const st = (statuses && statuses[key]) || 'idle';
                    return `
                        <div class="job-card status-${st}" id="rjob-${key.replace(/[^a-z0-9]/gi,'_')}">
                            <div class="job-name"><span class="job-status-dot"></span>${j.name}</div>
                            <div class="job-meta">${j.duration}ms</div>
                        </div>
                    `;
                }).join('')}
                ${!(jobs[s.name]||[]).length ? '<div style="color:#333;font-size:0.78rem;padding:8px 0;">No jobs</div>' : ''}
            </div>
        `).join('');
    }

    function logLine(html) {
        const log = document.getElementById('runLog');
        const ts = new Date().toLocaleTimeString('en-GB', { hour12: false });
        log.innerHTML += `<div><span class="log-time">${ts}</span>${html}</div>`;
        log.scrollTop = log.scrollHeight;
    }

    async function startRun() {
        if (!stages.length) { alert('Build a pipeline first.'); switchTab('build'); return; }
        document.getElementById('runBtn').style.display = 'none';
        document.getElementById('stopBtn').style.display = '';
        document.getElementById('runLog').innerHTML = '';
        const badge = document.getElementById('runBadge');
        badge.className = 'run-status-badge running';
        badge.textContent = 'Running';

        const statuses = {};
        const runStart = Date.now();
        let failed = false;
        const failedJobs = [];
        const runDurations = {};

        runState = { running: true };
        const self = runState;

        logLine('<span class="log-info">Pipeline started</span>');
        renderRunVis(statuses);

        for (const stage of stages) {
            if (!self.running) break;
            const stageJobs = jobs[stage.name] || [];
            if (!stageJobs.length) continue;

            logLine(`<span class="log-info">Stage <strong>${stage.name}</strong> — running ${stageJobs.length} job(s) in parallel</span>`);

            // Run all jobs in stage concurrently
            await Promise.all(stageJobs.map(j => new Promise(resolve => {
                const key = stage.name + '/' + j.name;
                statuses[key] = 'running';
                renderRunVis(statuses);

                const t = setTimeout(() => {
                    if (!self.running) { statuses[key] = 'skipped'; resolve(); return; }
                    const didFail = Math.random() * 100 < j.failRate;
                    statuses[key] = didFail ? 'failed' : 'passed';
                    runDurations[key] = j.duration;
                    if (didFail) { failed = true; failedJobs.push(key); }
                    const cls = didFail ? 'log-fail' : 'log-pass';
                    const icon = didFail ? '✗' : '✓';
                    logLine(`<span class="${cls}">${icon} ${key} (${j.duration}ms)</span>`);
                    renderRunVis(statuses);
                    resolve();
                }, j.duration / 4);

                if (!self.running) { clearTimeout(t); statuses[key] = 'skipped'; resolve(); }
            })));

            if (failed) {
                logLine(`<span class="log-fail">✗ Stage <strong>${stage.name}</strong> failed — stopping pipeline</span>`);
                // Mark remaining jobs as skipped
                for (let si = stages.indexOf(stage) + 1; si < stages.length; si++) {
                    (jobs[stages[si].name] || []).forEach(j => {
                        statuses[stages[si].name + '/' + j.name] = 'skipped';
                    });
                }
                renderRunVis(statuses);
                break;
            } else {
                logLine(`<span class="log-pass">✓ Stage <strong>${stage.name}</strong> passed</span>`);
            }
        }

        const elapsed = Date.now() - runStart;
        runCount++;

        if (self.running) {
            badge.className = 'run-status-badge ' + (failed ? 'failed' : 'passed');
            badge.textContent = failed ? 'Failed' : 'Passed';
            document.getElementById('runTime').textContent = `${(elapsed / 1000).toFixed(1)}s`;
            logLine(`<span class="${failed ? 'log-fail' : 'log-pass'}">${failed ? '✗ Pipeline FAILED' : '✓ Pipeline PASSED'} in ${(elapsed/1000).toFixed(1)}s</span>`);

            _history.unshift({ id: runCount, status: failed ? 'fail' : 'pass', duration: elapsed, failedJobs, ts: new Date().toLocaleTimeString() });
            if (_history.length > 20) _history.pop();

            // Accumulate durations for metrics
            Object.entries(runDurations).forEach(([k, v]) => {
                allDurations[k] = allDurations[k] || [];
                allDurations[k].push(v);
            });
        }

        document.getElementById('runBtn').style.display = '';
        document.getElementById('stopBtn').style.display = 'none';
        runState = null;
    }

    function stopRun() {
        if (runState) runState.running = false;
        document.getElementById('runBadge').className = 'run-status-badge idle';
        document.getElementById('runBadge').textContent = 'Stopped';
        document.getElementById('runBtn').style.display = '';
        document.getElementById('stopBtn').style.display = 'none';
        logLine('<span class="log-info">Pipeline stopped by user.</span>');
    }

    function renderMetrics() {
        const total = _history.length;
        document.getElementById('mTotalRuns').textContent = total;
        if (!total) {
            document.getElementById('mPassRate').textContent = '—';
            document.getElementById('mAvgDuration').textContent = '—';
            document.getElementById('mFastestRun').textContent = '—';
        } else {
            const passed = _history.filter(h => h.status === 'pass').length;
            document.getElementById('mPassRate').textContent = Math.round(passed / total * 100) + '%';
            const avg = _history.reduce((a, h) => a + h.duration, 0) / total;
            document.getElementById('mAvgDuration').textContent = (avg / 1000).toFixed(1) + 's';
            const fastest = Math.min(..._history.map(h => h.duration));
            document.getElementById('mFastestRun').textContent = (fastest / 1000).toFixed(1) + 's';
        }

        // Duration bars
        const barsEl = document.getElementById('durationBars');
        if (!Object.keys(allDurations).length) {
            barsEl.innerHTML = '<p style="color:#444;font-size:0.85rem;">No run data yet.</p>';
        } else {
            const maxAvg = Math.max(...Object.values(allDurations).map(arr => arr.reduce((a,b)=>a+b,0)/arr.length));
            barsEl.innerHTML = Object.entries(allDurations).map(([k, arr]) => {
                const avg = arr.reduce((a,b)=>a+b,0)/arr.length;
                const pct = maxAvg ? (avg / maxAvg * 100) : 0;
                const color = avg < 1000 ? '#56c98a' : avg < 3000 ? '#f4a261' : '#ef5350';
                return `
                    <div class="dur-row">
                        <div class="dur-label" title="${k}">${k}</div>
                        <div class="dur-bar-wrap"><div class="dur-bar" style="width:${pct}%;background:${color};"></div></div>
                        <div class="dur-ms">${Math.round(avg)}ms</div>
                    </div>
                `;
            }).join('');
        }

        // History table
        const tbody = document.getElementById('historyBody');
        if (!_history.length) {
            tbody.innerHTML = '<tr><td colspan="5" style="color:#444;text-align:center;padding:20px;">No runs yet.</td></tr>';
        } else {
            tbody.innerHTML = _history.map(h => `
                <tr>
                    <td>#${h.id}</td>
                    <td><span class="badge badge-${h.status === 'pass' ? 'pass' : 'fail'}">${h.status === 'pass' ? 'Passed' : 'Failed'}</span></td>
                    <td>${(h.duration/1000).toFixed(1)}s</td>
                    <td>${h.failedJobs.length ? h.failedJobs.join(', ') : '—'}</td>
                    <td>${h.ts}</td>
                </tr>
            `).join('');
        }
    }

    function loadPreset(type) {
        clearPipeline();
        if (type === 'basic') {
            stages = [
                { name: 'lint', color: '#6eb5ff' },
                { name: 'test', color: '#56c98a' },
                { name: 'build', color: '#f4a261' },
            ];
            jobs = {
                lint: [
                    { name: 'eslint', duration: 800, failRate: 8 },
                    { name: 'stylelint', duration: 600, failRate: 4 },
                ],
                test: [
                    { name: 'unit', duration: 2000, failRate: 10 },
                    { name: 'integration', duration: 3200, failRate: 6 },
                ],
                build: [
                    { name: 'compile', duration: 1500, failRate: 3 },
                    { name: 'docker-build', duration: 2800, failRate: 2 },
                ],
            };
        } else {
            stages = [
                { name: 'validate', color: '#6eb5ff' },
                { name: 'test', color: '#56c98a' },
                { name: 'build', color: '#f4a261' },
                { name: 'security', color: '#c9a0e8' },
                { name: 'staging', color: '#ffd580' },
                { name: 'deploy', color: '#ef5350' },
            ];
            jobs = {
                validate: [
                    { name: 'lint', duration: 700, failRate: 5 },
                    { name: 'type-check', duration: 1100, failRate: 7 },
                ],
                test: [
                    { name: 'unit', duration: 2000, failRate: 10 },
                    { name: 'e2e', duration: 4000, failRate: 8 },
                    { name: 'coverage', duration: 1500, failRate: 3 },
                ],
                build: [
                    { name: 'webpack', duration: 2200, failRate: 2 },
                    { name: 'docker', duration: 3000, failRate: 2 },
                ],
                security: [
                    { name: 'sast-scan', duration: 1800, failRate: 5 },
                    { name: 'dep-audit', duration: 1000, failRate: 4 },
                ],
                staging: [
                    { name: 'deploy-staging', duration: 2500, failRate: 4 },
                    { name: 'smoke-tests', duration: 1800, failRate: 6 },
                ],
                deploy: [
                    { name: 'prod-deploy', duration: 3000, failRate: 1 },
                    { name: 'healthcheck', duration: 800, failRate: 2 },
                ],
            };
        }
        renderAll();
    }

    function clearPipeline() {
        stages = [];
        jobs = {};
        renderAll();
    }

    loadPreset('basic');
