// ── Tutorial accordion ──────────────────────────────────────────────────────
    function toggleStep(id) {
        const body  = document.getElementById(id);
        const arrow = document.getElementById('arrow-' + id);
        const open  = body.classList.toggle('open');
        arrow.classList.toggle('open', open);
    }

    // ── BIOS Emulator ───────────────────────────────────────────────────────────
    const POST_LINES = [
        { text: '\n  UEFI BIOS v1.0.0 — Whymzykal Systems\n', cls: 'post-info', delay: 0 },
        { text: '  Copyright (C) 2026 Whymzykal Systems. All rights reserved.\n\n', delay: 80 },
        { text: '  CPU: Simulated x86-64 @ 3.60 GHz   Cores: 8   Threads: 16\n', cls: 'post-ok', delay: 200 },
        { text: '  Checking RAM ', delay: 400 },
        { text: '......', delay: 500, typing: true, typingDelay: 120 },
        { text: '  1024 MB OK\n', cls: 'post-ok', delay: 1300 },
        { text: '  Initialising PIC/PIT  ............  ', delay: 1500 },
        { text: 'OK\n', cls: 'post-ok', delay: 1600 },
        { text: '  Detecting storage:\n', delay: 1700 },
        { text: '    NVME0: Whymzykal NVMe SSD  512 GB\n', cls: 'post-ok', delay: 1900 },
        { text: '    SATA0: Whymzykal HDD       2 TB\n',   cls: 'post-ok', delay: 2100 },
        { text: '    SATA1: BD-ROM Optical Drive\n',        cls: 'post-ok', delay: 2300 },
        { text: '  Detecting USB ports  ..........  4 USB-A   2 USB-C   OK\n', cls: 'post-ok', delay: 2500 },
        { text: '  Detecting PCIe devices:\n', delay: 2700 },
        { text: '    Slot 1: Simulated GPU  8 GB VRAM\n',  cls: 'post-ok', delay: 2900 },
        { text: '    Slot 2: Intel I225-V   2.5GbE NIC\n', cls: 'post-ok', delay: 3100 },
        { text: '\n  POST complete. No errors.\n\n', cls: 'post-ok', delay: 3400 },
        { text: '  Boot Order: 1. NVME0  2. SATA0  3. Optical  4. USB\n', delay: 3700 },
        { text: '\n  Press [DEL] or [F2] to enter BIOS Setup\n', cls: 'post-warn', delay: 4000 },
        { text: '  Press [F12] for one-time Boot Menu\n\n', delay: 4000 },
        { text: '  Booting from NVME0: Whymzykal NVMe SSD', cls: 'post-info', delay: 5200 },
        { text: '...', delay: 5300, typing: true, typingDelay: 400 },
        { text: '\n  Loading OS bootloader...', cls: 'post-info', delay: 6600 },
        { text: '  ✓ Handoff complete.\n', cls: 'post-ok', delay: 7200 },
    ];

    // BIOS settings model
    const biosSettings = {
        main: [
            { label: 'System Time',     value: () => new Date().toTimeString().slice(0,8), editable: true, key: 'time' },
            { label: 'System Date',     value: () => new Date().toISOString().slice(0,10),  editable: true, key: 'date' },
            { label: '', type: 'sep' },
            { label: 'BIOS Version',    value: () => 'v1.0.0', readonly: true },
            { label: 'Processor',       value: () => 'Simulated x86-64 @ 3.60 GHz', readonly: true },
            { label: 'Total Memory',    value: () => '1024 MB', readonly: true },
            { label: '', type: 'sep' },
            { label: 'Language',        value: () => biosState.lang,
              options: ['English','Español','Français','Deutsch'], key: 'lang', editable: true },
        ],
        advanced: [
            { label: '— CPU Configuration —', type: 'section' },
            { label: 'Hyper-Threading',  value: () => biosState.hyperthreading, options: ['Enabled','Disabled'], key: 'hyperthreading', editable: true },
            { label: 'Turbo Boost',      value: () => biosState.turbo,          options: ['Enabled','Disabled'], key: 'turbo', editable: true },
            { label: '— Storage —', type: 'section' },
            { label: 'SATA Mode',        value: () => biosState.sataMode,       options: ['AHCI','IDE','RAID'], key: 'sataMode', editable: true },
            { label: 'NVMe Controller',  value: () => biosState.nvme,           options: ['Enabled','Disabled'], key: 'nvme', editable: true },
            { label: '— USB —', type: 'section' },
            { label: 'USB Legacy',       value: () => biosState.usbLegacy,      options: ['Enabled','Disabled'], key: 'usbLegacy', editable: true },
            { label: 'USB 3.2 Gen2',     value: () => biosState.usb32,          options: ['Enabled','Disabled'], key: 'usb32', editable: true },
        ],
        boot: [
            { label: '— Boot Priority —', type: 'section' },
            { label: 'Boot Option #1',   value: () => biosState.boot1, options: ['NVME0','SATA0','Optical','USB','Disabled'], key: 'boot1', editable: true },
            { label: 'Boot Option #2',   value: () => biosState.boot2, options: ['SATA0','NVME0','Optical','USB','Disabled'], key: 'boot2', editable: true },
            { label: 'Boot Option #3',   value: () => biosState.boot3, options: ['Optical','SATA0','NVME0','USB','Disabled'], key: 'boot3', editable: true },
            { label: '', type: 'sep' },
            { label: 'Fast Boot',        value: () => biosState.fastBoot, options: ['Enabled','Disabled'], key: 'fastBoot', editable: true },
            { label: 'POST Delay (sec)', value: () => String(biosState.postDelay), options: ['0','1','2','3','5'], key: 'postDelay', editable: true },
        ],
        security: [
            { label: '— Password —', type: 'section' },
            { label: 'Admin Password',  value: () => biosState.adminPass ? '****' : 'Not Set', editable: false, readonly: true },
            { label: 'User Password',   value: () => biosState.userPass  ? '****' : 'Not Set', editable: false, readonly: true },
            { label: '', type: 'sep' },
            { label: '— Secure Boot —', type: 'section' },
            { label: 'Secure Boot',     value: () => biosState.secureBoot, options: ['Enabled','Disabled'], key: 'secureBoot', editable: true },
            { label: 'Key Management',  value: () => 'Standard', readonly: true },
        ],
        exit: [
            { label: 'Save Changes & Exit',    type: 'action', action: 'save' },
            { label: 'Discard Changes & Exit', type: 'action', action: 'discard' },
            { label: '', type: 'sep' },
            { label: 'Load Optimized Defaults',type: 'action', action: 'defaults' },
        ],
    };

    const biosState = {
        lang: 'English', hyperthreading: 'Enabled', turbo: 'Enabled',
        sataMode: 'AHCI', nvme: 'Enabled', usbLegacy: 'Enabled', usb32: 'Enabled',
        boot1: 'NVME0', boot2: 'SATA0', boot3: 'Optical',
        fastBoot: 'Enabled', postDelay: '0',
        adminPass: false, userPass: false, secureBoot: 'Enabled',
    };

    const TABS = ['main','advanced','boot','security','exit'];
    const TAB_LABELS = { main:'Main', advanced:'Advanced', boot:'Boot', security:'Security', exit:'Exit' };

    let emuPhase     = 'off';   // off | post | setup
    let postTimeout  = null;
    let activeTab    = 0;
    let activeRow    = 0;
    let editMode     = false;
    let setupDirty   = false;

    // ── Power on ───────────────────────────────────────────────────────────────
    function emuPower() {
        if (emuPhase !== 'off') return;
        emuPhase = 'post';
        document.getElementById('btn-power').disabled   = true;
        document.getElementById('btn-setup').disabled   = false;
        document.getElementById('btn-restart').style.display = '';
        document.getElementById('emu-hint').textContent = 'POST running… press DEL to enter setup';
        document.getElementById('post-screen').style.display  = '';
        document.getElementById('setup-screen').style.display = 'none';
        document.getElementById('post-output').innerHTML = '';
        runPost(0);
    }

    function runPost(idx) {
        if (idx >= POST_LINES.length) {
            document.getElementById('btn-setup').disabled = true;
            document.getElementById('emu-hint').textContent = 'Boot complete.';
            emuPhase = 'booted';
            return;
        }
        if (emuPhase !== 'post') return;
        const item = POST_LINES[idx];
        postTimeout = setTimeout(() => {
            if (emuPhase !== 'post') return;
            appendPost(item.text, item.cls || '');
            runPost(idx + 1);
        }, item.delay);
    }

    function appendPost(text, cls) {
        const out  = document.getElementById('post-output');
        const span = document.createElement('span');
        span.textContent = text;
        if (cls) span.className = cls;
        out.appendChild(span);
        out.scrollTop = out.scrollHeight;
    }

    // ── Enter setup ────────────────────────────────────────────────────────────
    function emuEnterSetup() {
        if (emuPhase !== 'post' && emuPhase !== 'booted') return;
        clearTimeout(postTimeout);
        emuPhase = 'setup';
        document.getElementById('btn-setup').disabled = true;
        document.getElementById('emu-hint').textContent = 'BIOS Setup — use keyboard or click to navigate';
        document.getElementById('post-screen').style.display  = 'none';
        document.getElementById('setup-screen').style.display = '';
        activeTab = 0; activeRow = 0; editMode = false;
        renderSetup();
        document.getElementById('emu-wrap').focus();
    }

    function emuRestart() {
        clearTimeout(postTimeout);
        emuPhase = 'off';
        document.getElementById('btn-power').disabled = false;
        document.getElementById('btn-setup').disabled = true;
        document.getElementById('btn-restart').style.display = 'none';
        document.getElementById('emu-hint').textContent = 'Click Power On to begin';
        document.getElementById('post-screen').style.display  = '';
        document.getElementById('setup-screen').style.display = 'none';
        document.getElementById('post-output').innerHTML =
            '<span style="color:#888;">── Power off. Press "Power On" to start. ──</span>';
    }

    // ── Setup rendering ────────────────────────────────────────────────────────
    function renderSetup() {
        // Tabs
        const tabBar = document.getElementById('setup-tabs');
        tabBar.innerHTML = '';
        TABS.forEach((t, i) => {
            const d = document.createElement('div');
            d.className = 'setup-tab' + (i === activeTab ? ' active' : '');
            d.textContent = TAB_LABELS[t];
            d.onclick = () => { activeTab = i; activeRow = 0; editMode = false; renderSetup(); };
            tabBar.appendChild(d);
        });

        // Body rows
        const body = document.getElementById('setup-body');
        body.innerHTML = '';
        const rows = biosSettings[TABS[activeTab]];
        let rowIdx = 0;
        rows.forEach(item => {
            if (item.type === 'sep')     { body.appendChild(makeSep()); return; }
            if (item.type === 'section') { body.appendChild(makeSection(item.label)); return; }

            const ri = rowIdx++;
            const div = document.createElement('div');
            div.className = 'setup-row'
                + (item.readonly ? ' readonly' : '')
                + (ri === activeRow ? ' focused' : '');

            const lbl = document.createElement('span');
            lbl.className   = 'label';
            lbl.textContent = item.label;

            const val = document.createElement('span');
            val.className   = 'value';
            if (item.type === 'action') {
                lbl.textContent = '► ' + item.label;
                val.textContent = '';
                div.onclick = () => doSetupAction(item.action);
            } else {
                val.textContent = '[' + item.value() + ']';
                if (!item.readonly) div.onclick = () => { activeRow = ri; editMode = true; renderSetup(); cycleOption(item); };
            }

            div.appendChild(lbl);
            div.appendChild(val);
            body.appendChild(div);
        });
    }

    function makeSep() {
        const hr = document.createElement('hr');
        hr.style.cssText = 'border:none;border-top:1px solid #0000cc;margin:4px 0;';
        return hr;
    }
    function makeSection(text) {
        const d = document.createElement('div');
        d.className   = 'setup-section';
        d.textContent = text;
        return d;
    }

    function getEditableRows() {
        return biosSettings[TABS[activeTab]].filter(r => r.type !== 'sep' && r.type !== 'section');
    }

    function cycleOption(item) {
        if (!item.options || !item.key) return;
        const opts = item.options;
        const cur  = opts.indexOf(biosState[item.key]);
        biosState[item.key] = opts[(cur + 1) % opts.length];
        setupDirty = true;
        renderSetup();
    }

    function doSetupAction(action) {
        if (action === 'save') {
            setupDirty = false;
            appendPost('\n  [BIOS] Settings saved. Restarting…\n', 'post-ok');
            setTimeout(() => emuRestart(), 800);
        } else if (action === 'discard') {
            setupDirty = false;
            emuRestart();
        } else if (action === 'defaults') {
            Object.assign(biosState, {
                hyperthreading:'Enabled', turbo:'Enabled', sataMode:'AHCI',
                nvme:'Enabled', usbLegacy:'Enabled', usb32:'Enabled',
                boot1:'NVME0', boot2:'SATA0', boot3:'Optical',
                fastBoot:'Enabled', postDelay:'0', secureBoot:'Enabled',
            });
            setupDirty = true;
            renderSetup();
        }
    }

    // ── Keyboard handler ────────────────────────────────────────────────────────
    function emuKey(e) {
        if (emuPhase === 'post') {
            if (e.key === 'Delete' || e.key === 'F2') { e.preventDefault(); emuEnterSetup(); }
            return;
        }
        if (emuPhase !== 'setup') return;
        e.preventDefault();

        const editableRows = getEditableRows();
        const nonReadonly  = editableRows.filter(r => !r.readonly && r.type !== 'action'); // eslint-disable-line no-unused-vars

        switch (e.key) {
            case 'ArrowUp':
                activeRow = Math.max(0, activeRow - 1);
                renderSetup();
                break;
            case 'ArrowDown':
                activeRow = Math.min(editableRows.length - 1, activeRow + 1);
                renderSetup();
                break;
            case 'ArrowLeft':
            case 'ArrowRight': {
                activeTab = (activeTab + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length;
                activeRow = 0; renderSetup();
                break;
            }
            case 'Enter': case '+': {
                const item = editableRows[activeRow];
                if (!item) break;
                if (item.type === 'action') { doSetupAction(item.action); break; }
                if (!item.readonly && item.options) cycleOption(item);
                break;
            }
            case '-': {
                const item = editableRows[activeRow];
                if (!item || item.readonly || !item.options) break;
                const opts = item.options;
                const cur  = opts.indexOf(biosState[item.key]);
                biosState[item.key] = opts[(cur - 1 + opts.length) % opts.length];
                setupDirty = true;
                renderSetup();
                break;
            }
            case 'F10':
                doSetupAction('save');
                break;
            case 'Escape':
                doSetupAction('discard');
                break;
        }
    }
