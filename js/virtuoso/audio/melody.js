// ── DATA ─────────────────────────────────────────────────────────────────────

    const GLS_TERMS = [
        // Basics
        { term:'Pitch',        cat:'Basics', def:'The perceived frequency of a sound, described as high or low. Measured in Hz; A4 = 440 Hz.' },
        { term:'Note',         cat:'Basics', def:'A symbol representing both a specific pitch and its duration in written music.' },
        { term:'Tone',         cat:'Basics', def:'A steady musical sound of definite pitch, as opposed to noise or percussion.' },
        { term:'Semitone',     cat:'Basics', def:'The smallest standard interval in Western music — one half step (e.g., C to C♯).', ex:'C to D♭ is one semitone.' },
        { term:'Whole Step',   cat:'Basics', def:'Two semitones; the distance of a major second (e.g., C to D).', ex:'D to E is a whole step.' },
        { term:'Octave',       cat:'Basics', def:'The interval between two pitches where one is exactly double the frequency of the other. They share the same note name.', ex:'C4 to C5 is one octave.' },
        { term:'Enharmonic',   cat:'Basics', def:'Notes that sound the same but are spelled differently (e.g., C♯ and D♭).', ex:'G♯ and A♭ are enharmonic equivalents.' },
        { term:'Clef',         cat:'Basics', def:'A symbol at the start of a staff that assigns pitch to the lines and spaces. Treble clef (G clef) and bass clef (F clef) are most common.' },
        { term:'Staff',        cat:'Basics', def:'The set of five horizontal lines on which notes are written in standard notation.' },
        { term:'Ledger Line',  cat:'Basics', def:'Short lines added above or below the staff to extend its range.' },
        { term:'Rest',         cat:'Basics', def:'A period of silence in music, with symbols for each duration (whole, half, quarter, etc.).' },
        { term:'Accidental',   cat:'Basics', def:'A symbol that raises (♯), lowers (♭), or cancels (♮) a note\'s pitch. Applies for the rest of the measure.' },

        // Scales
        { term:'Scale',        cat:'Scales', def:'An ordered sequence of notes ascending or descending by defined intervals, forming the tonal basis for music.' },
        { term:'Major Scale',  cat:'Scales', def:'A diatonic scale with a bright, happy sound. Pattern: W W H W W W H (whole/half steps).', ex:'C D E F G A B C' },
        { term:'Minor Scale',  cat:'Scales', def:'A diatonic scale with a darker, sadder sound. Three forms: natural, harmonic, melodic.' },
        { term:'Natural Minor',cat:'Scales', def:'Minor scale using only diatonic notes with no alterations. Same notes as its relative major, but starting on the 6th degree.', ex:'C major → A natural minor' },
        { term:'Harmonic Minor',cat:'Scales',def:'Natural minor with a raised 7th degree, creating a leading tone and an augmented second between scale degrees 6 and 7.', ex:'A B C D E F G♯ A' },
        { term:'Melodic Minor',cat:'Scales', def:'Minor scale that raises both the 6th and 7th degrees ascending, then reverts to natural minor descending.' },
        { term:'Pentatonic',   cat:'Scales', def:'A five-note scale. Major pentatonic (1 2 3 5 6) is bright; minor pentatonic (1 ♭3 4 5 ♭7) is bluesy.', ex:'C D E G A — C major pentatonic' },
        { term:'Blues Scale',  cat:'Scales', def:'Minor pentatonic with an added ♭5 (blue note): 1 ♭3 4 ♭5 5 ♭7.', ex:'C E♭ F F♯ G B♭ C' },
        { term:'Chromatic Scale',cat:'Scales',def:'All 12 notes within an octave, each one semitone apart. Contains all possible half steps.' },
        { term:'Mode',         cat:'Scales', def:'A scale formed by starting on a different degree of a parent scale. The seven modes of the major scale are Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, and Locrian.' },
        { term:'Relative Key', cat:'Scales', def:'A major and minor key that share the same key signature. The relative minor starts on the 6th degree of the major scale.', ex:'C major and A minor are relative keys.' },
        { term:'Parallel Key', cat:'Scales', def:'A major and minor key that share the same root note.', ex:'C major and C minor are parallel keys.' },

        // Intervals
        { term:'Interval',     cat:'Intervals', def:'The distance in pitch between two notes. Described by number (unison through octave) and quality (perfect, major, minor, augmented, diminished).' },
        { term:'Consonance',   cat:'Intervals', def:'Intervals that sound stable and pleasant together: unisons, thirds, perfect fourths/fifths, sixths, octaves.' },
        { term:'Dissonance',   cat:'Intervals', def:'Intervals that create tension and a sense of wanting to resolve: seconds, sevenths, the tritone.' },
        { term:'Tritone',      cat:'Intervals', def:'An augmented fourth or diminished fifth — exactly 6 semitones. Historically called "diabolus in musica" for its instability.', ex:'C to F♯' },
        { term:'Compound Interval',cat:'Intervals',def:'An interval greater than one octave, such as a ninth (octave + second) or a tenth (octave + third).' },
        { term:'Inversion',    cat:'Intervals', def:'Flipping an interval by moving the lower note up an octave (or the higher note down). A major third inverts to a minor sixth; perfect intervals invert to perfect.' },

        // Chords
        { term:'Chord',        cat:'Chords', def:'Three or more notes sounded simultaneously (or arpeggiated). The most basic chords are triads.' },
        { term:'Triad',        cat:'Chords', def:'A three-note chord built by stacking thirds. Types: major (M3 + m3), minor (m3 + M3), diminished (m3 + m3), augmented (M3 + M3).' },
        { term:'Seventh Chord',cat:'Chords', def:'A four-note chord formed by adding a seventh above the root to a triad. Common types: major 7, dominant 7, minor 7, half-diminished 7, diminished 7.', ex:'Cmaj7 = C E G B' },
        { term:'Root Position', cat:'Chords', def:'A chord where the root (tonic note) is in the bass.' },
        { term:'Inversion (Chord)',cat:'Chords',def:'A chord where a note other than the root is in the bass. First inversion: third in bass. Second inversion: fifth in bass.', ex:'C/E is C major in first inversion.' },
        { term:'Voicing',      cat:'Chords', def:'The arrangement and distribution of notes in a chord across different octaves and instruments.' },
        { term:'Arpeggio',     cat:'Chords', def:'A chord whose notes are played in succession rather than simultaneously, often ascending or descending.' },
        { term:'Power Chord',  cat:'Chords', def:'A chord containing only the root and the fifth (no third), common in rock music. Sounds neither major nor minor.' },
        { term:'Extended Chord',cat:'Chords',def:'A chord with added ninths, elevenths, or thirteenths beyond the basic seventh chord.', ex:'C9 = C E G B♭ D' },
        { term:'Suspended Chord',cat:'Chords',def:'A chord where the third is replaced by a second (sus2) or fourth (sus4), creating a tense sound that "wants" to resolve.' },

        // Melody & Harmony
        { term:'Melody',       cat:'Melody', def:'A linear sequence of single notes that form a recognizable musical idea — the "tune" of a piece.' },
        { term:'Motif',        cat:'Melody', def:'A short, distinctive musical idea or cell — the smallest unit of a melody that has a recognizable shape, used repeatedly and developed throughout a composition.' },
        { term:'Phrase',       cat:'Melody', def:'A musical sentence — a complete unit of melody, typically 4–8 measures, that ends with a sense of pause or conclusion (cadence).' },
        { term:'Sequence',     cat:'Melody', def:'A melodic or harmonic pattern repeated at a higher or lower pitch level.', ex:'C–D–E, then D–E–F♯' },
        { term:'Range',        cat:'Melody', def:'The distance from the lowest to the highest note in a melody or vocal part.' },
        { term:'Conjunct Motion',cat:'Melody',def:'Stepwise melodic movement, moving by seconds. Creates smooth, singable lines.' },
        { term:'Disjunct Motion',cat:'Melody',def:'Melodic movement by leaps (intervals larger than a second). Creates drama and energy.' },
        { term:'Harmony',      cat:'Melody', def:'The simultaneous sounding of two or more notes; the vertical dimension of music, as opposed to melody\'s horizontal dimension.' },
        { term:'Counterpoint', cat:'Melody', def:'The art of combining two or more independent melodic lines that are harmonically interdependent. Developed systematically by Bach.' },
        { term:'Voice Leading', cat:'Melody', def:'The movement of individual melodic parts (voices) from chord to chord, following rules to minimize large leaps and avoid parallel fifths/octaves.' },

        // Rhythm
        { term:'Rhythm',       cat:'Rhythm', def:'The pattern of durations and accents of notes and rests over time — the temporal aspect of music.' },
        { term:'Beat',         cat:'Rhythm', def:'The basic pulse unit of music. Notes are measured in beats; time signatures indicate how they are organized.' },
        { term:'Tempo',        cat:'Rhythm', def:'The speed of the beat, measured in beats per minute (BPM). Often indicated with Italian terms (Allegro, Adagio) or a metronome marking.' },
        { term:'Meter',        cat:'Rhythm', def:'The organization of beats into recurring groups. Indicated by the time signature (e.g., 4/4, 3/4, 6/8).' },
        { term:'Time Signature',cat:'Rhythm',def:'Two numbers at the beginning of a piece: the top number gives beats per measure; the bottom indicates which note value = one beat.', ex:'4/4 = four quarter-note beats per measure' },
        { term:'Syncopation',  cat:'Rhythm', def:'Placing accents on normally weak beats or between beats, creating rhythmic tension and surprise.' },
        { term:'Polyrhythm',   cat:'Rhythm', def:'Two or more conflicting rhythmic patterns played simultaneously, each with a different pulse.', ex:'Three against two (triplet vs duplet)' },
        { term:'Hemiola',      cat:'Rhythm', def:'A rhythmic effect where three groups of two beats are replaced by two groups of three, shifting the accent pattern.' },
        { term:'Note Values',  cat:'Rhythm', def:'Durations: whole (4 beats), half (2), quarter (1), eighth (½), sixteenth (¼). Dotted notes extend by 50% of their value.' },

        // Form & Structure
        { term:'Form',         cat:'Form', def:'The overall structure or architecture of a piece of music — how sections are organized and related.' },
        { term:'Binary Form',  cat:'Form', def:'A two-part structure (A B), common in Baroque dances. Both sections are usually repeated.' },
        { term:'Ternary Form', cat:'Form', def:'A three-part structure (A B A) where a contrasting middle section returns to the opening material.' },
        { term:'Sonata Form',  cat:'Form', def:'A large-scale form with three sections: Exposition (themes introduced), Development (themes transformed), Recapitulation (themes restated in tonic).' },
        { term:'Rondo',        cat:'Form', def:'A form with a recurring main theme (A) alternating with contrasting episodes: A B A C A or A B A C A B A.' },
        { term:'Theme & Variations',cat:'Form',def:'A form where a theme is stated, then repeated with changes in harmony, rhythm, melody, or texture.' },
        { term:'Coda',         cat:'Form', def:'A concluding section of a piece, typically after the main structure, that provides a sense of finality.' },
        { term:'Exposition',   cat:'Form', def:'The opening section of a fugue or sonata form where the main thematic material is first presented.' },
        { term:'Development',  cat:'Form', def:'The middle section of sonata form where themes are fragmented, transformed, and explored through various keys.' },
        { term:'Recapitulation',cat:'Form',def:'The final section of sonata form where the themes from the exposition return, usually entirely in the tonic key.' },

        // Texture & Timbre
        { term:'Texture',      cat:'Texture', def:'How layers of sound are combined in music. Main types: monophony, homophony, polyphony, heterophony.' },
        { term:'Monophony',    cat:'Texture', def:'A single melodic line with no accompaniment.', ex:'Gregorian chant' },
        { term:'Homophony',    cat:'Texture', def:'A primary melody supported by chordal accompaniment, all moving in the same rhythm or near-same rhythm.', ex:'A song with piano chords' },
        { term:'Polyphony',    cat:'Texture', def:'Multiple independent melodic lines occurring simultaneously.', ex:'A Bach fugue' },
        { term:'Timbre',       cat:'Texture', def:'The characteristic tone color or quality of a sound that distinguishes one instrument (or voice) from another at the same pitch and volume.' },
        { term:'Articulation', cat:'Texture', def:'How notes are performed and connected. Includes legato (smooth), staccato (short/detached), accent, tenuto, and others.' },

        // Harmony/Functional
        { term:'Key',          cat:'Harmony', def:'The tonal center of a piece — the note (tonic) and scale around which the music gravitates.' },
        { term:'Tonic',        cat:'Harmony', def:'The 1st scale degree; the home chord/note of a key. Music gravitates toward and resolves to the tonic.' },
        { term:'Dominant',     cat:'Harmony', def:'The 5th scale degree. The dominant chord (V) creates strong tension that resolves to the tonic (I).' },
        { term:'Subdominant',  cat:'Harmony', def:'The 4th scale degree. The subdominant chord (IV) provides contrast and motion away from tonic.' },
        { term:'Leading Tone', cat:'Harmony', def:'The 7th scale degree in a major scale, one half step below the tonic. Creates strong pull to resolve up to the tonic.' },
        { term:'Cadence',      cat:'Harmony', def:'A harmonic progression that creates a sense of pause or closure at the end of a phrase. Types: authentic, plagal, half, deceptive.' },
        { term:'Modulation',   cat:'Harmony', def:'Changing from one key to another within a piece. Achieved through pivot chords, chromatic motion, or direct modulation.' },
        { term:'Diatonic',     cat:'Harmony', def:'Notes, chords, or scales that belong naturally to a given key without chromatic alteration.' },
        { term:'Chromatic',    cat:'Harmony', def:'Notes that do not belong to the current key, introduced for color, tension, or modulation.' },
        { term:'Tonicization', cat:'Harmony', def:'Brief emphasis on a chord other than the tonic, making it sound temporarily like a local tonic without fully modulating.' },
        { term:'Secondary Dominant',cat:'Harmony',def:'A dominant (or dominant 7th) chord applied to a chord other than the tonic, written as V/x.', ex:'V/V in C major = D7, leading to G' },
        { term:'Pedal Point',  cat:'Harmony', def:'A sustained or repeated note (usually in the bass) held while harmonies change above it.' },
    ];

    const SCALE_PATTERNS = [
        { name:'Major',         pattern:'W W H W W W H', notes:'C D E F G A B', feel:'Bright, happy' },
        { name:'Natural Minor', pattern:'W H W W H W W', notes:'A B C D E F G', feel:'Dark, sad' },
        { name:'Harmonic Minor',pattern:'W H W W H A H', notes:'A B C D E F G♯', feel:'Dramatic, exotic' },
        { name:'Melodic Minor (asc)',pattern:'W H W W W W H',notes:'A B C D E F♯ G♯',feel:'Smooth, jazzy' },
        { name:'Pentatonic Major',pattern:'W W WH W WH', notes:'C D E G A', feel:'Open, folk' },
        { name:'Pentatonic Minor',pattern:'WH W W WH W',notes:'A C D E G', feel:'Bluesy, rock' },
        { name:'Blues',         pattern:'WH W H H WH W',notes:'A C D D♯ E G', feel:'Soulful' },
        { name:'Dorian',        pattern:'W H W W W H W', notes:'D E F G A B C', feel:'Minor but bright' },
        { name:'Phrygian',      pattern:'H W W W H W W', notes:'E F G A B C D', feel:'Dark, Spanish' },
        { name:'Lydian',        pattern:'W W W H W W H', notes:'F G A B C D E', feel:'Dreamy, floating' },
        { name:'Mixolydian',    pattern:'W W H W W H W', notes:'G A B C D E F', feel:'Dominant, bluesy' },
        { name:'Locrian',       pattern:'H W W H W W W', notes:'B C D E F G A', feel:'Very dark, unstable' },
    ];

    const CHORD_FORMULAS = [
        { name:'Major',       formula:'1 – 3 – 5',    intervals:'M3 + m3',    example:'C E G',     sym:'C' },
        { name:'Minor',       formula:'1 – ♭3 – 5',   intervals:'m3 + M3',    example:'C E♭ G',    sym:'Cm' },
        { name:'Diminished',  formula:'1 – ♭3 – ♭5',  intervals:'m3 + m3',    example:'C E♭ G♭',   sym:'C°' },
        { name:'Augmented',   formula:'1 – 3 – ♯5',   intervals:'M3 + M3',    example:'C E G♯',    sym:'C+' },
        { name:'Major 7th',   formula:'1 – 3 – 5 – 7', intervals:'M3+m3+M3',  example:'C E G B',   sym:'Cmaj7' },
        { name:'Dominant 7th',formula:'1 – 3 – 5 – ♭7',intervals:'M3+m3+m3', example:'C E G B♭',  sym:'C7' },
        { name:'Minor 7th',   formula:'1 – ♭3 – 5 – ♭7',intervals:'m3+M3+m3',example:'C E♭ G B♭', sym:'Cm7' },
        { name:'Half-dim 7th',formula:'1 – ♭3 – ♭5 – ♭7',intervals:'m3+m3+M3',example:'C E♭ G♭ B♭',sym:'Cø7' },
        { name:'Diminished 7th',formula:'1 – ♭3 – ♭5 – ♭♭7',intervals:'m3+m3+m3',example:'C E♭ G♭ B♭♭',sym:'C°7' },
        { name:'Suspended 2nd',formula:'1 – 2 – 5',  intervals:'M2 + P4',    example:'C D G',     sym:'Csus2' },
        { name:'Suspended 4th',formula:'1 – 4 – 5',  intervals:'P4 + M2',    example:'C F G',     sym:'Csus4' },
        { name:'Add 9',       formula:'1 – 3 – 5 – 9',intervals:'+M2 above oct',example:'C E G D', sym:'Cadd9' },
        { name:'Power',       formula:'1 – 5',        intervals:'P5',         example:'C G',       sym:'C5' },
    ];

    // ── Chromatic helpers ─────────────────────────────────────────────────────────
    const CHROMATIC = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
    const SCALE_FORMULAS = {
        'Major':           [0,2,4,5,7,9,11,12],
        'Natural Minor':   [0,2,3,5,7,8,10,12],
        'Harmonic Minor':  [0,2,3,5,7,8,11,12],
        'Pentatonic Major':[0,2,4,7,9,12],
        'Pentatonic Minor':[0,3,5,7,10,12],
        'Dorian':          [0,2,3,5,7,9,10,12],
        'Phrygian':        [0,1,3,5,7,8,10,12],
        'Lydian':          [0,2,4,6,7,9,11,12],
        'Mixolydian':      [0,2,4,5,7,9,10,12],
        'Blues':           [0,3,5,6,7,10,12],
        'Chromatic':       [0,1,2,3,4,5,6,7,8,9,10,11,12],
    };
    const CHORD_SEMITONES = {
        'major':        [0,4,7],
        'minor':        [0,3,7],
        'diminished':   [0,3,6],
        'augmented':    [0,4,8],
        'dominant 7th': [0,4,7,10],
        'major 7th':    [0,4,7,11],
        'minor 7th':    [0,3,7,10],
    };
    const INTERVAL_NAMES = ['Unison','m2','M2','m3','M3','P4','Tritone','P5','m6','M6','m7','M7','Octave'];

    function noteAtSemitone(root, semitones) {
        const idx = (CHROMATIC.indexOf(root) + semitones) % 12;
        return CHROMATIC[(idx + 12) % 12];
    }

    // ── TAB SYSTEM ───────────────────────────────────────────────────────────────
    function showTab(id) {
        document.querySelectorAll('.mel-tab-panel').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.mel-tab').forEach(t => t.classList.remove('active'));
        document.getElementById('tab-' + id).classList.add('active');
        const tabs = document.querySelectorAll('.mel-tab');
        const labels = ['glossary','exercises','reference','compose'];
        tabs[labels.indexOf(id)].classList.add('active');
    }

    // ── GLOSSARY ─────────────────────────────────────────────────────────────────
    const GLS_CATS = ['All', ...new Set(GLS_TERMS.map(t => t.cat))];
    let glsActiveCat = 'All';

    function buildGlossary() {
        const catBar = document.getElementById('gls-cats');
        GLS_CATS.forEach(c => {
            const btn = document.createElement('button');
            btn.className = 'gls-cat-btn' + (c === 'All' ? ' active' : '');
            btn.textContent = c;
            btn.onclick = () => { glsActiveCat = c; document.querySelectorAll('.gls-cat-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); filterGls(); };
            catBar.appendChild(btn);
        });
        filterGls();
    }

    function filterGls() {
        const q = document.getElementById('gls-search').value.toLowerCase().trim();
        const grid = document.getElementById('gls-grid');
        grid.innerHTML = '';
        const filtered = GLS_TERMS.filter(t => {
            if (glsActiveCat !== 'All' && t.cat !== glsActiveCat) return false;
            if (q && !t.term.toLowerCase().includes(q) && !t.def.toLowerCase().includes(q)) return false;
            return true;
        });
        if (!filtered.length) {
            grid.innerHTML = '<div class="gls-none">No terms found.</div>';
            return;
        }
        filtered.forEach(t => {
            const card = document.createElement('div');
            card.className = 'gls-card';
            card.innerHTML = `<div class="gls-term">${t.term}</div><div class="gls-cat-tag">${t.cat}</div><div class="gls-def">${t.def}</div>${t.ex ? `<div class="gls-example">e.g. ${t.ex}</div>` : ''}`;
            grid.appendChild(card);
        });
    }

    // ── REFERENCE TABLES ─────────────────────────────────────────────────────────
    function buildReference() {
        const sb = document.getElementById('scales-body');
        SCALE_PATTERNS.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${s.name}</td><td>${s.pattern}</td><td>${s.notes}</td><td>${s.feel}</td>`;
            sb.appendChild(tr);
        });
        const cb = document.getElementById('chords-body');
        CHORD_FORMULAS.forEach(c => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${c.name}</td><td class="chord-formula">${c.formula}</td><td>${c.intervals}</td><td>${c.example}</td><td style="color:#888;">${c.sym}</td>`;
            cb.appendChild(tr);
        });
    }

    // ── EXERCISES ────────────────────────────────────────────────────────────────

    // — Interval exercise —
    let intScore = {right:0, total:0};
    let intAnswer = '';

    function nextInterval() {
        const n1 = CHROMATIC[Math.floor(Math.random()*12)];
        const semis = Math.floor(Math.random()*13);
        const n2 = CHROMATIC[(CHROMATIC.indexOf(n1) + semis) % 12];
        intAnswer = INTERVAL_NAMES[semis];

        document.getElementById('int-prompt').textContent = n1 + '  →  ' + n2;
        document.getElementById('int-fb').textContent = '';
        document.getElementById('int-fb').className = 'ex-feedback';
        document.getElementById('int-next').disabled = true;

        // Build distractors
        const distractors = [...INTERVAL_NAMES].filter(n => n !== intAnswer);
        shuffle(distractors);
        const opts = shuffle([intAnswer, distractors[0], distractors[1], distractors[2]]);

        const optsEl = document.getElementById('int-opts');
        optsEl.innerHTML = '';
        opts.forEach(o => {
            const btn = document.createElement('button');
            btn.className = 'ex-opt-btn';
            btn.textContent = o;
            btn.onclick = () => {
                optsEl.querySelectorAll('.ex-opt-btn').forEach(b => b.disabled = true);
                intScore.total++;
                if (o === intAnswer) {
                    btn.classList.add('correct');
                    intScore.right++;
                    document.getElementById('int-fb').textContent = '✓ Correct!';
                    document.getElementById('int-fb').className = 'ex-feedback good';
                } else {
                    btn.classList.add('wrong');
                    optsEl.querySelectorAll('.ex-opt-btn').forEach(b => { if (b.textContent === intAnswer) b.classList.add('correct'); });
                    document.getElementById('int-fb').textContent = '✗ The answer was ' + intAnswer + '.';
                    document.getElementById('int-fb').className = 'ex-feedback bad';
                }
                document.getElementById('int-score').textContent = intScore.right + ' / ' + intScore.total;
                document.getElementById('int-next').disabled = false;
            };
            optsEl.appendChild(btn);
        });
    }

    // — Scale exercise —
    let sclScore = {right:0, total:0};
    let sclAnswer = [];
    let sclSelected = [];
    let sclDone = false;

    const SCL_TYPES = Object.keys(SCALE_FORMULAS).filter(k => k !== 'Chromatic');

    function nextScale() {
        const root = CHROMATIC[Math.floor(Math.random()*12)];
        const type = SCL_TYPES[Math.floor(Math.random()*SCL_TYPES.length)];
        sclAnswer = SCALE_FORMULAS[type].map(s => noteAtSemitone(root, s));
        sclSelected = [];
        sclDone = false;

        document.getElementById('scl-prompt').textContent = 'Build the ' + root + ' ' + type + ' scale';
        document.getElementById('scl-fb').textContent = '';
        document.getElementById('scl-fb').className = 'ex-feedback';
        document.getElementById('scl-next').disabled = true;

        // Build mini piano keyboard SVG
        buildScaleKeyboard(root, sclAnswer);
    }

    function buildScaleKeyboard(root, answer) {
        const wrap = document.getElementById('scl-keyboard');
        wrap.innerHTML = '';

        // 2 octaves of white keys starting from C
        const whites = ['C','D','E','F','G','A','B','C','D','E','F','G','A','B'];
        const blacks  = [null,'C♯',null,'D♯',null,null,'F♯',null,'G♯',null,'A♯',null,null,null,null,'C♯',null,'D♯',null,null,'F♯',null,'G♯',null,'A♯',null,null,null];
        const W = 32, H = 90, bW = 20, bH = 58;
        const totalW = whites.length * W + 4;

        const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
        svg.setAttribute('width', totalW);
        svg.setAttribute('height', H + 8);
        svg.setAttribute('viewBox', `0 0 ${totalW} ${H+8}`);

        // White keys
        whites.forEach((note, i) => {
            const inAnswer = answer.includes(note);
            const rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
            rect.setAttribute('x', i*W+2); rect.setAttribute('y','2');
            rect.setAttribute('width', W-2); rect.setAttribute('height', H);
            rect.setAttribute('rx','3');
            rect.setAttribute('fill', inAnswer && sclSelected.includes(note) ? '#4caf50' : (inAnswer ? '#f4d0aa' : '#e8e0d4'));
            rect.setAttribute('stroke','#555'); rect.setAttribute('stroke-width','1');
            const text = document.createElementNS('http://www.w3.org/2000/svg','text');
            text.setAttribute('x', i*W+2+W/2-1); text.setAttribute('y', H-8);
            text.setAttribute('text-anchor','middle');
            text.setAttribute('font-family','Courier New,monospace');
            text.setAttribute('font-size','9');
            text.setAttribute('fill','#333');
            text.textContent = note;

            const g = document.createElementNS('http://www.w3.org/2000/svg','g');
            g.style.cursor = 'pointer';
            g.appendChild(rect); g.appendChild(text);
            g.addEventListener('click', () => handleScaleClick(note, rect));
            svg.appendChild(g);
        });

        // Black keys
        whites.forEach((note, i) => {
            const bn = blacks[i];
            if (!bn) { return; }
            const inAnswer = answer.includes(bn);
            const bx = i*W + W - bW/2;
            const rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
            rect.setAttribute('x', bx); rect.setAttribute('y','2');
            rect.setAttribute('width', bW); rect.setAttribute('height', bH);
            rect.setAttribute('rx','2');
            rect.setAttribute('fill', inAnswer && sclSelected.includes(bn) ? '#1b5e20' : (inAnswer ? '#c9a0e8' : '#1a1a1a'));
            rect.setAttribute('stroke','#000'); rect.setAttribute('stroke-width','1');
            const text = document.createElementNS('http://www.w3.org/2000/svg','text');
            text.setAttribute('x', bx+bW/2); text.setAttribute('y', bH-4);
            text.setAttribute('text-anchor','middle');
            text.setAttribute('font-family','Courier New,monospace');
            text.setAttribute('font-size','7');
            text.setAttribute('fill','#aaa');
            text.textContent = bn;

            const g = document.createElementNS('http://www.w3.org/2000/svg','g');
            g.style.cursor = 'pointer';
            g.appendChild(rect); g.appendChild(text);
            g.addEventListener('click', () => handleScaleClick(bn, rect));
            svg.appendChild(g);
        });

        wrap.appendChild(svg);
    }

    function handleScaleClick(note, rect) {
        if (sclDone) return;
        if (sclSelected.includes(note)) return;
        sclSelected.push(note);

        const expected = sclAnswer[sclSelected.length - 1];
        if (note === expected) {
            rect.setAttribute('fill', note.includes('♯') ? '#1b5e20' : '#4caf50');
            if (sclSelected.length === sclAnswer.length) {
                sclDone = true;
                sclScore.right++;
                sclScore.total++;
                document.getElementById('scl-fb').textContent = '✓ Perfect! All notes correct.';
                document.getElementById('scl-fb').className = 'ex-feedback good';
                document.getElementById('scl-score').textContent = sclScore.right + ' / ' + sclScore.total;
                document.getElementById('scl-next').disabled = false;
            }
        } else {
            sclDone = true;
            sclScore.total++;
            rect.setAttribute('fill', '#c62828');
            document.getElementById('scl-fb').textContent = '✗ Wrong note. Expected: ' + sclAnswer[sclSelected.length - 1];
            document.getElementById('scl-fb').className = 'ex-feedback bad';
            document.getElementById('scl-score').textContent = sclScore.right + ' / ' + sclScore.total;
            document.getElementById('scl-next').disabled = false;
        }
    }

    // — Chord exercise —
    let chdScore = {right:0, total:0};
    let chdAnswer = [];
    const CHD_TYPES = Object.keys(CHORD_SEMITONES);

    function nextChord() {
        const root = CHROMATIC[Math.floor(Math.random()*12)];
        const type = CHD_TYPES[Math.floor(Math.random()*CHD_TYPES.length)];
        chdAnswer = CHORD_SEMITONES[type].map(s => noteAtSemitone(root, s));

        document.getElementById('chd-prompt').textContent = root + ' ' + type;
        document.getElementById('chd-fb').textContent = '';
        document.getElementById('chd-fb').className = 'ex-feedback';
        document.getElementById('chd-next').disabled = true;

        // Generate wrong note combos
        const wrongSets = [];
        while (wrongSets.length < 3) {
            const fakeRoot = CHROMATIC[Math.floor(Math.random()*12)];
            const fakeType = CHD_TYPES[Math.floor(Math.random()*CHD_TYPES.length)];
            const fake = CHORD_SEMITONES[fakeType].map(s => noteAtSemitone(fakeRoot, s));
            if (fake.join() !== chdAnswer.join()) wrongSets.push(fake.join(' '));
        }

        const opts = shuffle([chdAnswer.join(' '), ...wrongSets]);
        const optsEl = document.getElementById('chd-opts');
        optsEl.innerHTML = '';
        const ansStr = chdAnswer.join(' ');
        opts.forEach(o => {
            const btn = document.createElement('button');
            btn.className = 'ex-opt-btn';
            btn.textContent = o;
            btn.onclick = () => {
                optsEl.querySelectorAll('.ex-opt-btn').forEach(b => b.disabled = true);
                chdScore.total++;
                if (o === ansStr) {
                    btn.classList.add('correct');
                    chdScore.right++;
                    document.getElementById('chd-fb').textContent = '✓ Correct!';
                    document.getElementById('chd-fb').className = 'ex-feedback good';
                } else {
                    btn.classList.add('wrong');
                    optsEl.querySelectorAll('.ex-opt-btn').forEach(b => { if (b.textContent === ansStr) b.classList.add('correct'); });
                    document.getElementById('chd-fb').textContent = '✗ The answer was ' + ansStr + '.';
                    document.getElementById('chd-fb').className = 'ex-feedback bad';
                }
                document.getElementById('chd-score').textContent = chdScore.right + ' / ' + chdScore.total;
                document.getElementById('chd-next').disabled = false;
            };
            optsEl.appendChild(btn);
        });
    }

    // — Rhythm exercise —
    let rhyScore = {right:0, total:0};
    let rhyAnswer = '';
    const RHYTHMS = [
        { sig:'4/4', patterns:['♩ ♩ ♩ ♩','♩ ♩ ♪♪ ♩','♩. ♪ ♩ ♩','♩ ♪♪ ♩. ♪'] },
        { sig:'3/4', patterns:['♩ ♩ ♩','♩. ♪ ♩','♩ ♪♪ ♩','♩ ♩ ♪♪'] },
        { sig:'2/4', patterns:['♩ ♩','♩ ♪♪','♪♪ ♩','♪♪ ♪♪'] },
        { sig:'6/8', patterns:['♪. ♪.','♪♪♪ ♪♪♪','♩♪ ♩♪','♪. ♪♪♪'] },
        { sig:'5/4', patterns:['♩ ♩ ♩ ♩ ♩','♩. ♪ ♩ ♩ ♩','♩ ♩ ♩ ♩. ♪'] },
    ];

    function nextRhythm() {
        const entry = RHYTHMS[Math.floor(Math.random()*RHYTHMS.length)];
        const pattern = entry.patterns[Math.floor(Math.random()*entry.patterns.length)];
        rhyAnswer = entry.sig;

        document.getElementById('rhy-prompt').textContent = pattern;
        document.getElementById('rhy-fb').textContent = '';
        document.getElementById('rhy-fb').className = 'ex-feedback';
        document.getElementById('rhy-next').disabled = true;

        const distractors = RHYTHMS.map(r => r.sig).filter(s => s !== rhyAnswer);
        shuffle(distractors);
        const opts = shuffle([rhyAnswer, distractors[0], distractors[1], distractors[2]]);

        const optsEl = document.getElementById('rhy-opts');
        optsEl.innerHTML = '';
        opts.forEach(o => {
            const btn = document.createElement('button');
            btn.className = 'ex-opt-btn';
            btn.textContent = o;
            btn.onclick = () => {
                optsEl.querySelectorAll('.ex-opt-btn').forEach(b => b.disabled = true);
                rhyScore.total++;
                if (o === rhyAnswer) {
                    btn.classList.add('correct');
                    rhyScore.right++;
                    document.getElementById('rhy-fb').textContent = '✓ Correct!';
                    document.getElementById('rhy-fb').className = 'ex-feedback good';
                } else {
                    btn.classList.add('wrong');
                    optsEl.querySelectorAll('.ex-opt-btn').forEach(b => { if (b.textContent === rhyAnswer) b.classList.add('correct'); });
                    document.getElementById('rhy-fb').textContent = '✗ The answer was ' + rhyAnswer + '.';
                    document.getElementById('rhy-fb').className = 'ex-feedback bad';
                }
                document.getElementById('rhy-score').textContent = rhyScore.right + ' / ' + rhyScore.total;
                document.getElementById('rhy-next').disabled = false;
            };
            optsEl.appendChild(btn);
        });
    }

    // ── COMPOSE TAB ──────────────────────────────────────────────────────────────
    let composedNotes = [];

    function buildComposePalette() {
        const palette = document.getElementById('compose-palette');
        palette.innerHTML = '';
        const scaleType = document.getElementById('compose-scale').value;

        // Build scale from selections
        const rootClean = document.getElementById('compose-key').value;

        const formula = SCALE_FORMULAS[scaleType] || SCALE_FORMULAS['Major'];
        const scaleNotes = formula.map(s => CHROMATIC[(CHROMATIC.indexOf(rootClean.length > 1 && CHROMATIC.includes(rootClean) ? rootClean : CHROMATIC[0]) + s) % 12]);

        // Just show all 12 chromatic notes, highlight scale notes
        CHROMATIC.forEach(note => {
            const inScale = scaleNotes.includes(note);
            const btn = document.createElement('button');
            btn.className = 'note-btn' + (note.includes('♯') ? ' sharp' : '');
            btn.textContent = note;
            if (inScale) {
                btn.style.borderColor = 'rgba(244,162,97,0.8)';
                btn.style.background = 'rgba(244,162,97,0.2)';
                btn.style.color = '#f4a261';
            }
            btn.title = inScale ? '✓ In scale' : 'Not in scale';
            btn.onclick = () => addComposeNote(note);
            palette.appendChild(btn);
        });
    }

    function addComposeNote(note) {
        composedNotes.push(note);
        renderComposed();
    }

    function renderComposed() {
        const row = document.getElementById('composed-row');
        row.innerHTML = '';
        if (!composedNotes.length) {
            row.innerHTML = '<span style="font-family:\'Courier New\',monospace;font-size:11px;color:#333;font-style:italic;">Click notes above to start your phrase...</span>';
            return;
        }
        composedNotes.forEach((n, i) => {
            const el = document.createElement('div');
            el.className = 'composed-note';
            el.textContent = n;
            el.title = 'Click to remove';
            el.onclick = () => { composedNotes.splice(i, 1); renderComposed(); document.getElementById('compose-analysis').style.display = 'none'; };
            row.appendChild(el);
        });
    }

    function clearPhrase() {
        composedNotes = [];
        renderComposed();
        document.getElementById('compose-analysis').style.display = 'none';
    }

    function analyzePhrase() {
        if (!composedNotes.length) return;
        const root = document.getElementById('compose-key').value;
        const scaleType = document.getElementById('compose-scale').value;
        const formula = SCALE_FORMULAS[scaleType] || SCALE_FORMULAS['Major'];
        const scaleNotes = formula.map(s => CHROMATIC[(CHROMATIC.indexOf(CHROMATIC.includes(root) ? root : 'C') + s) % 12]);

        const outsideScale = composedNotes.filter(n => !scaleNotes.includes(n));
        const unique = [...new Set(composedNotes)];
        const leaps = [];
        for (let i = 1; i < composedNotes.length; i++) {
            const a = CHROMATIC.indexOf(composedNotes[i-1]);
            const b = CHROMATIC.indexOf(composedNotes[i]);
            const dist = Math.abs(b - a);
            const semi = dist > 6 ? 12 - dist : dist;
            if (semi > 4) leaps.push(composedNotes[i-1] + '→' + composedNotes[i] + ' (' + INTERVAL_NAMES[semi] + ')');
        }

        // Detect if phrase starts and ends on root
        const startsOnRoot = composedNotes[0] === root;
        const endsOnRoot   = composedNotes[composedNotes.length-1] === root;

        // Detect repeated notes (motif potential)
        const freq = {};
        composedNotes.forEach(n => freq[n] = (freq[n]||0)+1);
        const repeated = Object.entries(freq).filter(([,c]) => c > 1).map(([n,c]) => n + ' ×' + c);

        let html = `<strong style="color:#f4a261;">Analysis: ${root} ${scaleType}</strong><br><br>`;
        html += `<span style="color:#aaa;">Length:</span> ${composedNotes.length} notes — `;
        html += `<span style="color:#aaa;">Unique pitches:</span> ${unique.length}<br>`;
        html += `<span style="color:#aaa;">In-scale notes:</span> ${composedNotes.length - outsideScale.length} / ${composedNotes.length}`;
        if (outsideScale.length) html += ` — <span style="color:#f4a261;">Chromatic: ${[...new Set(outsideScale)].join(', ')}</span>`;
        html += '<br>';
        html += `<span style="color:#aaa;">Motion:</span> ${leaps.length ? 'Conjunct with leaps at: ' + leaps.join(', ') : 'Mostly conjunct (stepwise)'}.<br>`;
        html += `<span style="color:#aaa;">Opens on root (${root}):</span> ${startsOnRoot ? '✓ Yes' : '✗ No'} · <span style="color:#aaa;">Closes on root:</span> ${endsOnRoot ? '✓ Yes — strong cadence sense' : '✗ No — phrase feels open'}<br>`;
        if (repeated.length) html += `<span style="color:#aaa;">Repeated notes (potential motif):</span> ${repeated.join(', ')}<br>`;

        // Tips
        html += '<br><span style="color:#f4a261;font-size:10px;letter-spacing:2px;text-transform:uppercase;">Tips</span><br>';
        if (composedNotes.length < 4) html += '• Add more notes to form a complete phrase (aim for 6–12 notes).<br>';
        if (outsideScale.length > composedNotes.length * 0.4) html += '• Many chromatic notes detected — consider whether each creates intentional color or tension.<br>';
        if (leaps.length > composedNotes.length * 0.3) html += '• Many large leaps — after a leap, try moving by step in the opposite direction to balance the line.<br>';
        if (!endsOnRoot) html += '• Ending on a note other than the root gives an open, unresolved feeling — try ending on ' + root + ' for closure.<br>';
        if (!repeated.length && composedNotes.length > 6) html += '• No repeated notes yet — consider repeating a 2–3 note motif to give the phrase cohesion.<br>';

        const el = document.getElementById('compose-analysis');
        el.innerHTML = html;
        el.style.display = 'block';
    }

    function playPhrase() {
        if (!composedNotes.length) return;
        const NOTE_FREQS = { C:261.63,'C♯':277.18,D:293.66,'D♯':311.13,E:329.63,F:349.23,'F♯':369.99,G:392.00,'G♯':415.30,A:440.00,'A♯':466.16,B:493.88 };
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const tempo = 0.35; // seconds per note
        composedNotes.forEach((note, i) => {
            const freq = NOTE_FREQS[note];
            if (!freq) return;
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            osc.connect(gain); gain.connect(ctx.destination);
            const t = ctx.currentTime + i * tempo;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.35, t + 0.02);
            gain.gain.setValueAtTime(0.35, t + tempo * 0.7);
            gain.gain.linearRampToValueAtTime(0, t + tempo * 0.95);
            osc.start(t);
            osc.stop(t + tempo);
        });
    }

    // ── UTILITIES ────────────────────────────────────────────────────────────────
    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    // ── INIT ─────────────────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        buildGlossary();
        buildReference();
        nextInterval();
        nextScale();
        nextChord();
        nextRhythm();
        buildComposePalette();

        document.getElementById('compose-key').addEventListener('change', buildComposePalette);
        document.getElementById('compose-scale').addEventListener('change', buildComposePalette);
    });
