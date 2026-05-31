// ════════════════════════════════════════════════════════════════════════
// TABS
// ════════════════════════════════════════════════════════════════════════
const TABS = ['nutrition','planner','calc'];
function switchTab(t) {
    TABS.forEach(id => {
        document.getElementById('tab-'+id).classList.toggle('active', id===t);
        document.getElementById('tab-'+id+'-content').style.display = id===t ? '' : 'none';
    });
}

// ════════════════════════════════════════════════════════════════════════
// NUTRITION CONTENT
// ════════════════════════════════════════════════════════════════════════
const MACRO_CARDS = [
  { title:'Protein', body:`
    <p>The building block of muscle, enzymes, and hormones. Essential for repair and growth.</p>
    <ul>
      <li><strong>General target:</strong> 0.7–1.0 g per lb of body weight (1.6–2.2 g/kg).</li>
      <li><strong>Best sources:</strong> chicken breast, eggs, Greek yoghurt, tofu, fish, legumes.</li>
      <li><strong>Calories:</strong> <span class="spec-tag">4 kcal / gram</span></li>
      <li>Protein has the highest <em>thermic effect</em> of food — your body burns ~25% of protein calories just digesting it.</li>
      <li>Spreading intake across meals (30–50 g per sitting) maximises muscle protein synthesis.</li>
    </ul>
  `},
  { title:'Carbohydrates', body:`
    <p>The body's preferred fuel source, especially for the brain and high-intensity exercise.</p>
    <ul>
      <li><strong>Complex carbs:</strong> oats, sweet potato, brown rice, quinoa, whole grain bread. Slower digesting, more fibre.</li>
      <li><strong>Simple carbs:</strong> fruit, honey, white rice. Fast-digesting — useful around workouts.</li>
      <li><strong>Calories:</strong> <span class="spec-tag">4 kcal / gram</span></li>
      <li><strong>Fibre target:</strong> 25–38 g/day. Supports gut health, satiety, and blood sugar regulation.</li>
      <li>Aim for the majority of carbs to come from whole, minimally processed sources.</li>
    </ul>
  `},
  { title:'Dietary Fat', body:`
    <p>Critical for hormone production, brain function, vitamin absorption (A, D, E, K), and cell membranes.</p>
    <ul>
      <li><strong>Unsaturated (healthy):</strong> olive oil, avocado, nuts, seeds, fatty fish (omega-3s).</li>
      <li><strong>Saturated:</strong> butter, red meat, dairy — fine in moderation (under ~10% of calories).</li>
      <li><strong>Trans fat:</strong> partially hydrogenated oils — avoid entirely.</li>
      <li><strong>Calories:</strong> <span class="spec-tag">9 kcal / gram</span></li>
      <li>Omega-3 fatty acids (EPA &amp; DHA) in oily fish reduce inflammation and support cardiovascular health.</li>
    </ul>
  `},
  { title:'Calorie Basics', body:`
    <p>Energy balance determines body weight over time. It's more nuanced than "eat less, move more" — but that's the foundation.</p>
    <ul>
      <li><strong>Deficit:</strong> consume fewer calories than you burn → weight loss.</li>
      <li><strong>Surplus:</strong> consume more → weight gain (ideally muscle, with training + adequate protein).</li>
      <li><strong>Maintenance:</strong> calories in ≈ calories out → stable weight.</li>
      <li>1 lb of fat ≈ 3,500 kcal. A 500-calorie daily deficit = ~1 lb/week.</li>
      <li>Extreme deficits (>1,000 cal/day) risk muscle loss, nutrient deficiencies, and metabolic adaptation.</li>
    </ul>
  `},
];

const MICRO_CARDS = [
  { title:'Key Vitamins', body:`
    <ul>
      <li><strong>Vitamin D</strong> — bone health, immune function, mood. Synthesised from sunlight. Supplement if deficient (most people are). 1,000–4,000 IU/day.</li>
      <li><strong>B12</strong> — nerve function, red blood cells. Found only in animal products. Supplement if vegan/vegetarian.</li>
      <li><strong>Vitamin C</strong> — antioxidant, immune support, collagen synthesis. Citrus, bell peppers, kiwi.</li>
      <li><strong>Folate (B9)</strong> — DNA synthesis, cell division. Leafy greens, legumes, fortified cereals.</li>
      <li><strong>Vitamin K</strong> — blood clotting, bone metabolism. Dark leafy greens.</li>
    </ul>
  `},
  { title:'Key Minerals', body:`
    <ul>
      <li><strong>Iron</strong> — oxygen transport in blood. Lean red meat, lentils, spinach. Vitamin C enhances absorption.</li>
      <li><strong>Calcium</strong> — bones, muscle contraction, nerve signals. Dairy, fortified plant milks, broccoli. 1,000 mg/day.</li>
      <li><strong>Magnesium</strong> — 300+ enzymatic reactions, sleep quality, muscle function. Nuts, seeds, dark chocolate.</li>
      <li><strong>Zinc</strong> — immune function, testosterone, wound healing. Meat, shellfish, pumpkin seeds.</li>
      <li><strong>Potassium</strong> — blood pressure, muscle contraction. Bananas, sweet potato, avocado.</li>
    </ul>
  `},
  { title:'Hydration', body:`
    <p>Water regulates body temperature, transports nutrients, lubricates joints, and flushes waste.</p>
    <ul>
      <li><strong>Baseline:</strong> ~0.5 oz per lb of body weight per day (or 35 ml/kg).</li>
      <li><strong>During exercise:</strong> add 16–24 oz (500–700 ml) per hour of activity.</li>
      <li><strong>Electrolytes:</strong> sodium, potassium, magnesium lost in sweat — replenish after intense or long sessions.</li>
      <li>Urine colour is a practical guide: pale yellow = hydrated, dark yellow = drink more, clear = possibly overhydrated.</li>
      <li>Coffee and tea count toward daily intake — the mild diuretic effect is offset by the water content.</li>
    </ul>
  `},
  { title:'Meal Timing & Habits', body:`
    <ul>
      <li><strong>Pre-workout (1–2 hrs before):</strong> moderate carbs + protein. e.g. rice and chicken, banana and Greek yoghurt.</li>
      <li><strong>Post-workout (within 2 hrs):</strong> protein + carbs to replenish glycogen and start repair. 20–40 g protein.</li>
      <li><strong>Meal frequency:</strong> 3 meals or 4–5 smaller meals — both work. Choose what you can sustain.</li>
      <li><strong>Sleep and nutrition:</strong> a small casein-rich snack before bed (cottage cheese, Greek yoghurt) may support overnight muscle repair.</li>
      <li><strong>Intermittent fasting:</strong> 16:8 or 5:2 can work for fat loss when total calories are controlled. Not magic — just a scheduling tool.</li>
    </ul>
  `},
];

const PROTEIN_TABLE_DATA = [
    ['Chicken breast (100g)', '31g', '165 kcal', 'Low fat, versatile'],
    ['Eggs (2 large)', '12g', '143 kcal', 'Complete amino profile'],
    ['Greek yoghurt (170g)', '17g', '100 kcal', 'Also high calcium'],
    ['Canned tuna (100g)', '25g', '108 kcal', 'Cheap, shelf-stable'],
    ['Salmon (100g)', '25g', '208 kcal', 'High omega-3s'],
    ['Cottage cheese (100g)', '11g', '98 kcal', 'Slow-digesting casein'],
    ['Black beans (100g cooked)', '8g', '132 kcal', 'Also high fibre'],
    ['Lentils (100g cooked)', '9g', '116 kcal', 'Iron + folate too'],
    ['Tofu, firm (100g)', '8g', '76 kcal', 'Complete plant protein'],
    ['Tempeh (100g)', '19g', '195 kcal', 'Fermented, probiotic'],
    ['Beef, lean (100g)', '26g', '218 kcal', 'High zinc + B12'],
    ['Whey protein (30g scoop)', '24g', '120 kcal', 'Fast-absorbing'],
];

const CARB_TABLE_DATA = [
    ['Oats (100g dry)', '66g carbs', '389 kcal', 'High beta-glucan fibre'],
    ['Sweet potato (100g)', '20g carbs', '86 kcal', 'Vitamin A, potassium'],
    ['Brown rice (100g cooked)', '23g carbs', '111 kcal', 'Low GI, filling'],
    ['Quinoa (100g cooked)', '22g carbs', '120 kcal', 'Also 4g protein'],
    ['Banana (medium)', '27g carbs', '105 kcal', 'Pre-workout fuel'],
    ['Avocado (half)', '6g carbs', '161 kcal', '15g healthy fat'],
    ['Olive oil (1 tbsp)', '0g carbs', '119 kcal', '14g monounsaturated fat'],
    ['Almonds (28g)', '6g carbs', '164 kcal', '14g fat, 6g protein'],
    ['Dark chocolate 70% (28g)', '13g carbs', '170 kcal', 'Antioxidants, magnesium'],
    ['Blueberries (100g)', '14g carbs', '57 kcal', 'High antioxidants'],
];

function buildInfoGrid(containerId, cards) {
    const grid = document.getElementById(containerId);
    cards.forEach((c, i) => {
        const bodyId = containerId + '_' + i;
        const card   = document.createElement('div');
        card.className = 'info-card';
        card.innerHTML =
            '<div class="info-card-title" onclick="toggleInfo(\'' + bodyId + '\',this)">' +
                '<span>' + c.title + '</span><span>&#9658;</span>' +
            '</div>' +
            '<div class="info-card-body" id="' + bodyId + '">' + c.body + '</div>';
        grid.appendChild(card);
    });
}

function toggleInfo(id, titleEl) {
    const open  = document.getElementById(id).classList.toggle('open');
    const arrow = titleEl.querySelector('span:last-child');
    if (arrow) arrow.innerHTML = open ? '&#9660;' : '&#9658;';
}

function buildFoodTable(id, headers, rows) {
    const t   = document.getElementById(id);
    const hdr = document.createElement('tr');
    headers.forEach(h => { const th = document.createElement('th'); th.textContent = h; hdr.appendChild(th); });
    t.appendChild(hdr);
    rows.forEach(row => {
        const tr = document.createElement('tr');
        row.forEach((cell, i) => {
            const td = document.createElement('td');
            td.textContent = cell;
            if (i === 1) td.className = 'hl';
            tr.appendChild(td);
        });
        t.appendChild(tr);
    });
}

// ════════════════════════════════════════════════════════════════════════
// UNITS
// ════════════════════════════════════════════════════════════════════════
let units = 'imperial';

function setUnits(u) {
    units = u;
    document.getElementById('unit-imperial').classList.toggle('active', u==='imperial');
    document.getElementById('unit-metric').classList.toggle('active', u==='metric');
    document.getElementById('weight-label').textContent   = u==='imperial' ? 'Weight (lbs)' : 'Weight (kg)';
    document.getElementById('height-label').textContent   = u==='imperial' ? 'Height (ft)'  : 'Height (cm)';
    document.getElementById('height-label-b').textContent = u==='imperial' ? 'Height (in)'  : '(leave blank)';
    document.getElementById('p-height-b').style.display   = u==='imperial' ? '' : 'none';
}

// ════════════════════════════════════════════════════════════════════════
// EXERCISE PLANNER
// ════════════════════════════════════════════════════════════════════════
const EXERCISES = {
    // Strength movements by muscle group
    squat:      { name:'Barbell Back Squat',          sets:'4', reps:'6–8',   note:'Drive knees out, chest up' },
    gobletSq:   { name:'Goblet Squat',                sets:'3', reps:'12–15', note:'Hold dumbbell at chest' },
    deadlift:   { name:'Conventional Deadlift',       sets:'3', reps:'5–6',   note:'Brace core throughout' },
    rdl:        { name:'Romanian Deadlift',            sets:'3', reps:'10–12', note:'Hinge at hips, soft knees' },
    hipThrust:  { name:'Hip Thrust',                  sets:'3', reps:'12–15', note:'Full glute contraction at top' },
    lunge:      { name:'Reverse Lunge',               sets:'3', reps:'10 ea', note:'Controlled descent' },
    benchPress: { name:'Barbell Bench Press',         sets:'4', reps:'6–8',   note:'Retract scapulae' },
    dbPress:    { name:'Dumbbell Chest Press',        sets:'3', reps:'10–12', note:'Full range of motion' },
    inclinePress:{ name:'Incline Dumbbell Press',     sets:'3', reps:'10–12', note:'15–30° incline' },
    ohp:        { name:'Overhead Press',              sets:'3', reps:'8–10',  note:'Neutral spine, brace abs' },
    lateralRaise:{ name:'Lateral Raise',              sets:'3', reps:'15–20', note:'Slight bend in elbows' },
    pullUp:     { name:'Pull-Up / Lat Pulldown',      sets:'3', reps:'8–10',  note:'Full hang, controlled descent' },
    bentRow:    { name:'Barbell Bent-Over Row',       sets:'4', reps:'6–8',   note:'Bar to lower chest' },
    dbRow:      { name:'Single-Arm Dumbbell Row',     sets:'3', reps:'10–12', note:'Brace on bench, squeeze lats' },
    cableFly:   { name:'Cable Fly / Pec Deck',        sets:'3', reps:'12–15', note:'Stretch at full extension' },
    tricepPush: { name:'Tricep Pushdown',             sets:'3', reps:'12–15', note:'Keep elbows at sides' },
    bicepCurl:  { name:'Barbell Bicep Curl',          sets:'3', reps:'10–12', note:'No swinging' },
    plank:      { name:'Plank',                       sets:'3', reps:'45 sec', note:'Neutral spine, squeeze glutes' },
    crunches:   { name:'Cable Crunch / Sit-Up',       sets:'3', reps:'15–20', note:'Controlled movement' },
    legPress:   { name:'Leg Press',                   sets:'3', reps:'12–15', note:'Full range, feet hip-width' },
    calfRaise:  { name:'Standing Calf Raise',         sets:'4', reps:'15–20', note:'Pause at top and bottom' },
    // Cardio
    run30:      { name:'Steady-State Run',            sets:'1', reps:'30 min', note:'Zone 2 — conversational pace' },
    run45:      { name:'Steady-State Run',            sets:'1', reps:'45 min', note:'Maintain consistent pace' },
    tempo:      { name:'Tempo Run',                   sets:'1', reps:'25 min', note:'Comfortably hard — 7/10 effort' },
    intervals:  { name:'Run Intervals',               sets:'6', reps:'400 m', note:'90 sec rest between reps' },
    cycle30:    { name:'Cycling / Stationary Bike',   sets:'1', reps:'30 min', note:'Moderate resistance, zone 2' },
    hiit20:     { name:'HIIT Circuit',                sets:'4', reps:'5 min blocks', note:'20 sec on / 10 sec off' },
    burpees:    { name:'Burpees',                     sets:'3', reps:'15',    note:'Full extension at top' },
    jumpRope:   { name:'Jump Rope',                   sets:'3', reps:'3 min', note:'1 min rest between rounds' },
    rowing20:   { name:'Rowing Machine',              sets:'1', reps:'20 min', note:'Focus on leg drive' },
    walkJog:    { name:'Walk / Jog Intervals',        sets:'1', reps:'30 min', note:'Alternate 2 min walk, 1 min jog' },
    // Recovery
    stretch:    { name:'Full-Body Stretch',           sets:'1', reps:'15 min', note:'Hold each stretch 30–60 sec' },
    mobilityFlow:{ name:'Mobility Flow',              sets:'1', reps:'20 min', note:'Focus on hips and thoracic spine' },
};

const PLAN_TEMPLATES = {
    lose: {
        2: [
            { name:'Full Body Strength + Cardio', type:'mixed',    exs:['squat','benchPress','bentRow','ohp','plank','run30'] },
            { name:'Full Body Strength + HIIT',   type:'hiit',     exs:['deadlift','dbPress','pullUp','lunge','hipThrust','hiit20'] },
        ],
        3: [
            { name:'Full Body Strength A',         type:'strength', exs:['squat','benchPress','bentRow','plank','calfRaise'] },
            { name:'HIIT + Core',                  type:'hiit',     exs:['hiit20','burpees','jumpRope','crunches','plank'] },
            { name:'Full Body Strength B',         type:'strength', exs:['deadlift','dbPress','pullUp','lunge','lateralRaise'] },
        ],
        4: [
            { name:'Upper Body Strength',          type:'strength', exs:['benchPress','bentRow','ohp','pullUp','bicepCurl','tricepPush'] },
            { name:'HIIT Cardio',                  type:'hiit',     exs:['hiit20','burpees','jumpRope','intervals'] },
            { name:'Lower Body Strength',          type:'strength', exs:['squat','rdl','lunge','hipThrust','calfRaise','plank'] },
            { name:'Steady-State Cardio',          type:'cardio',   exs:['run30','stretch'] },
        ],
        5: [
            { name:'Push (Chest / Shoulders)',     type:'strength', exs:['benchPress','ohp','inclinePress','lateralRaise','tricepPush'] },
            { name:'Cardio / HIIT',                type:'hiit',     exs:['run30','hiit20'] },
            { name:'Pull (Back / Biceps)',         type:'strength', exs:['pullUp','bentRow','dbRow','bicepCurl','crunches'] },
            { name:'Legs',                         type:'strength', exs:['squat','rdl','lunge','hipThrust','calfRaise'] },
            { name:'Cardio + Core',                type:'cardio',   exs:['cycle30','plank','crunches','stretch'] },
        ],
        6: [
            { name:'Push',                         type:'strength', exs:['benchPress','ohp','inclinePress','cableFly','tricepPush','lateralRaise'] },
            { name:'Pull',                         type:'strength', exs:['pullUp','bentRow','dbRow','bicepCurl','crunches'] },
            { name:'Legs + HIIT',                  type:'mixed',    exs:['squat','rdl','hipThrust','calfRaise','hiit20'] },
            { name:'Push (light)',                 type:'strength', exs:['dbPress','ohp','lateralRaise','tricepPush','plank'] },
            { name:'Pull (light) + Cardio',        type:'mixed',    exs:['pullUp','dbRow','run30'] },
            { name:'Active Recovery',              type:'rest',     exs:['walkJog','stretch','mobilityFlow'] },
        ],
    },
    gain: {
        2: [
            { name:'Full Body A (heavy)',           type:'strength', exs:['squat','benchPress','bentRow','ohp','calfRaise'] },
            { name:'Full Body B (heavy)',           type:'strength', exs:['deadlift','inclinePress','pullUp','hipThrust','bicepCurl','tricepPush'] },
        ],
        3: [
            { name:'Full Body A',                  type:'strength', exs:['squat','benchPress','bentRow','ohp','calfRaise'] },
            { name:'Full Body B',                  type:'strength', exs:['deadlift','dbPress','pullUp','lunge','plank'] },
            { name:'Full Body C',                  type:'strength', exs:['legPress','inclinePress','dbRow','ohp','hipThrust','bicepCurl'] },
        ],
        4: [
            { name:'Upper A (push focus)',          type:'strength', exs:['benchPress','inclinePress','ohp','cableFly','tricepPush','lateralRaise'] },
            { name:'Lower A',                      type:'strength', exs:['squat','rdl','hipThrust','lunge','calfRaise','plank'] },
            { name:'Upper B (pull focus)',          type:'strength', exs:['pullUp','bentRow','dbRow','bicepCurl','crunches'] },
            { name:'Lower B',                      type:'strength', exs:['deadlift','legPress','lunge','calfRaise','plank'] },
        ],
        5: [
            { name:'Push A',                       type:'strength', exs:['benchPress','inclinePress','ohp','cableFly','tricepPush','lateralRaise'] },
            { name:'Pull A',                       type:'strength', exs:['pullUp','bentRow','dbRow','bicepCurl','plank'] },
            { name:'Legs A',                       type:'strength', exs:['squat','rdl','hipThrust','lunge','calfRaise'] },
            { name:'Push B (light + volume)',       type:'strength', exs:['dbPress','lateralRaise','ohp','tricepPush','crunches'] },
            { name:'Pull B + Legs B',              type:'strength', exs:['deadlift','pullUp','legPress','calfRaise'] },
        ],
        6: [
            { name:'Push A',                       type:'strength', exs:['benchPress','inclinePress','ohp','cableFly','tricepPush'] },
            { name:'Pull A',                       type:'strength', exs:['pullUp','bentRow','dbRow','bicepCurl'] },
            { name:'Legs A',                       type:'strength', exs:['squat','rdl','hipThrust','calfRaise','plank'] },
            { name:'Push B',                       type:'strength', exs:['dbPress','lateralRaise','ohp','tricepPush','lateralRaise'] },
            { name:'Pull B',                       type:'strength', exs:['pullUp','dbRow','bicepCurl','crunches'] },
            { name:'Legs B',                       type:'strength', exs:['deadlift','legPress','lunge','calfRaise'] },
        ],
    },
    maintain: {
        2: [
            { name:'Full Body + Light Cardio',     type:'mixed',    exs:['squat','benchPress','bentRow','run30','plank'] },
            { name:'Full Body + Mobility',         type:'mixed',    exs:['deadlift','dbPress','pullUp','mobilityFlow','calfRaise'] },
        ],
        3: [
            { name:'Full Body Strength',           type:'strength', exs:['squat','benchPress','bentRow','ohp','plank'] },
            { name:'Cardio + Core',                type:'cardio',   exs:['run30','crunches','plank','stretch'] },
            { name:'Full Body Strength + Mobility',type:'mixed',    exs:['deadlift','dbPress','pullUp','hipThrust','mobilityFlow'] },
        ],
        4: [
            { name:'Upper Strength',               type:'strength', exs:['benchPress','bentRow','ohp','bicepCurl','tricepPush'] },
            { name:'Lower Strength',               type:'strength', exs:['squat','rdl','lunge','calfRaise','plank'] },
            { name:'Cardio',                       type:'cardio',   exs:['run30','stretch'] },
            { name:'Full Body + Mobility',         type:'mixed',    exs:['deadlift','pullUp','hipThrust','mobilityFlow'] },
        ],
        5: [
            { name:'Push',                         type:'strength', exs:['benchPress','ohp','inclinePress','tricepPush','lateralRaise'] },
            { name:'Cardio',                       type:'cardio',   exs:['run30','stretch'] },
            { name:'Pull',                         type:'strength', exs:['pullUp','bentRow','dbRow','bicepCurl'] },
            { name:'Legs',                         type:'strength', exs:['squat','rdl','hipThrust','calfRaise','plank'] },
            { name:'Active Recovery',              type:'rest',     exs:['cycle30','mobilityFlow','stretch'] },
        ],
    },
    endurance: {
        2: [
            { name:'Long Run',                     type:'cardio',   exs:['run45','stretch'] },
            { name:'Tempo Run + Strength',         type:'mixed',    exs:['tempo','squat','rdl','plank'] },
        ],
        3: [
            { name:'Long Run',                     type:'cardio',   exs:['run45','stretch'] },
            { name:'Interval Training',            type:'hiit',     exs:['intervals','jumpRope','stretch'] },
            { name:'Easy Recovery Run',            type:'cardio',   exs:['walkJog','mobilityFlow'] },
        ],
        4: [
            { name:'Long Run',                     type:'cardio',   exs:['run45','stretch'] },
            { name:'Interval Training',            type:'hiit',     exs:['intervals','jumpRope'] },
            { name:'Strength + Core',              type:'strength', exs:['squat','rdl','plank','crunches','calfRaise'] },
            { name:'Easy Run / Cycle',             type:'cardio',   exs:['walkJog','cycle30','stretch'] },
        ],
        5: [
            { name:'Long Run',                     type:'cardio',   exs:['run45','stretch'] },
            { name:'Tempo Run',                    type:'cardio',   exs:['tempo','stretch'] },
            { name:'Interval Training',            type:'hiit',     exs:['intervals','jumpRope'] },
            { name:'Strength Support',             type:'strength', exs:['squat','rdl','plank','calfRaise','hipThrust'] },
            { name:'Easy Recovery + Mobility',     type:'rest',     exs:['walkJog','mobilityFlow','stretch'] },
        ],
        6: [
            { name:'Long Run',                     type:'cardio',   exs:['run45','stretch'] },
            { name:'Tempo Run',                    type:'cardio',   exs:['tempo'] },
            { name:'Easy Run',                     type:'cardio',   exs:['run30','stretch'] },
            { name:'Intervals',                    type:'hiit',     exs:['intervals','rowing20'] },
            { name:'Strength + Core',              type:'strength', exs:['squat','rdl','plank','calfRaise'] },
            { name:'Active Recovery',              type:'rest',     exs:['walkJog','mobilityFlow','stretch'] },
        ],
    },
};

const DAY_NAMES = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const BADGE_LEVEL = {
    beginner:     { sets: -1, repsNote: 'Start light — focus on form' },
    intermediate: { sets:  0, repsNote: '' },
    advanced:     { sets: +1, repsNote: 'Increase weight each week (progressive overload)' },
};

function generatePlan() {
    const age     = parseInt(document.getElementById('p-age').value);
    const sex     = document.getElementById('p-sex').value;
    const rawW    = parseFloat(document.getElementById('p-weight').value);
    const rawHa   = parseFloat(document.getElementById('p-height-a').value);
    const rawHb   = parseFloat(document.getElementById('p-height-b').value) || 0;
    const goal    = document.getElementById('p-goal').value;
    const activity= parseFloat(document.getElementById('p-activity').value);
    const days    = parseInt(document.getElementById('p-days').value);
    const level   = document.getElementById('p-level').value;

    const errEl = document.getElementById('plan-error');
    errEl.textContent = '';

    if (!age || !rawW || !rawHa) { errEl.textContent = 'Please fill in age, weight, and height.'; return; }
    if (age < 13 || age > 100)   { errEl.textContent = 'Please enter a valid age (13–100).'; return; }

    let weightKg, heightCm;
    if (units === 'imperial') {
        weightKg = rawW * 0.453592;
        heightCm = ((rawHa * 12) + rawHb) * 2.54;
    } else {
        weightKg = rawW;
        heightCm = rawHa;
    }

    // Mifflin-St Jeor BMR
    const bmr = sex === 'm'
        ? (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5
        : (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161;
    const tdee = Math.round(bmr * activity);

    const goalCals = { lose: tdee - 500, gain: tdee + 300, maintain: tdee, endurance: tdee + 200 };
    const targetCal = Math.max(1200, goalCals[goal]);

    // Macros
    const macros = {
        lose:      { p:0.40, c:0.35, f:0.25 },
        gain:      { p:0.30, c:0.45, f:0.25 },
        maintain:  { p:0.30, c:0.40, f:0.30 },
        endurance: { p:0.25, c:0.55, f:0.20 },
    }[goal];
    const protG = Math.round((targetCal * macros.p) / 4);
    const carbG = Math.round((targetCal * macros.c) / 4);
    const fatG  = Math.round((targetCal * macros.f) / 9);

    const bmi     = (weightKg / ((heightCm / 100) ** 2)).toFixed(1);
    const bmiCat  = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Healthy' : bmi < 30 ? 'Overweight' : 'Obese';

    const goalLabels = { lose:'Weight Loss', gain:'Muscle Gain', maintain:'Maintenance & Tone', endurance:'Endurance' };

    // Summary cards
    const sumData = [
        { val: targetCal.toLocaleString(), unit:'kcal / day' },
        { val: protG + 'g',               unit:'protein / day' },
        { val: bmi,                        unit:'BMI (' + bmiCat + ')' },
        { val: days + ' days',             unit:'training / week' },
    ];
    const sumWrap = document.getElementById('plan-summary');
    sumWrap.innerHTML = '';
    sumData.forEach(s => {
        const div = document.createElement('div');
        div.className = 'sum-card';
        div.innerHTML = '<div class="sum-val">' + s.val + '</div><div class="sum-unit">' + s.unit + '</div>';
        sumWrap.appendChild(div);
    });

    // Macro bars
    const barsWrap = document.getElementById('macro-bars');
    barsWrap.innerHTML = '';
    [
        { label:'Protein', g:protG, pct:macros.p, color:'#f4a261' },
        { label:'Carbs',   g:carbG, pct:macros.c, color:'#42a5f5' },
        { label:'Fat',     g:fatG,  pct:macros.f, color:'#ab47bc' },
    ].forEach(m => {
        barsWrap.innerHTML +=
            '<div class="macro-bar-wrap">' +
            '<div class="macro-bar-label"><span>' + m.label + '</span><span>' + m.g + 'g (' + Math.round(m.pct*100) + '%)</span></div>' +
            '<div class="macro-bar-track"><div class="macro-bar-fill" style="width:' + Math.round(m.pct*100) + '%;background:' + m.color + ';"></div></div>' +
            '</div>';
    });

    // Tips
    const TIPS = {
        lose:      ['Aim for a 250–500 cal/day deficit — not more', 'Prioritise protein to preserve muscle', 'Get 7–9 hrs sleep — cortisol kills fat loss', 'Drink water before meals to manage hunger', 'Track intake with an app for at least 2–4 weeks'],
        gain:      ['Eat ~300 cal above maintenance consistently', 'Progressive overload — add weight or reps weekly', 'Get 7–9 hrs sleep — growth hormone peaks overnight', 'Eat within 2 hrs post-workout (protein + carbs)', 'Track lifts in a notebook or app'],
        maintain:  ['Consistency beats perfection — don\'t miss weeks', 'Mix cardio and strength to preserve both adaptations', 'Adjust intake if weight trends up or down for 2+ weeks', 'Mobility work reduces injury risk and improves performance'],
        endurance: ['Build mileage slowly — no more than 10% per week', 'Zone 2 cardio (conversational pace) is the base', 'Carb-load before long efforts (>90 min)', 'Foam roll and stretch after every session', 'Iron and electrolyte intake is critical for runners'],
    };
    document.getElementById('plan-tips').innerHTML = TIPS[goal].map(t => '&#9656; ' + t).join('<br>');
    document.getElementById('plan-headline').textContent = goalLabels[goal] + ' Plan — ' + days + ' Days / Week';

    // Weekly schedule
    const template = (PLAN_TEMPLATES[goal][days] || PLAN_TEMPLATES[goal][3]);
    const restDays = 7 - days;
    const weekGrid = document.getElementById('week-grid');
    weekGrid.innerHTML = '';

    const adj = BADGE_LEVEL[level];
    let dayIdx = 0;

    for (let d = 0; d < 7; d++) {
        const isRest    = d >= days;
        const dayRow    = document.createElement('div');
        dayRow.className = 'day-row';
        const session   = isRest ? null : template[dayIdx % template.length];
        const badgeType = isRest ? 'rest' : session.type;
        const badgeLabel= isRest ? 'Rest' : session.type.toUpperCase();
        const focus     = isRest ? 'Rest &amp; Recovery' : session.name;

        dayRow.innerHTML =
            '<div class="day-header" onclick="toggleDay(this)">' +
                '<span class="day-name">' + DAY_NAMES[d] + '</span>' +
                '<span class="day-focus">' + focus + '</span>' +
                '<span class="day-badge ' + badgeType + '">' + badgeLabel + '</span>' +
                '<span class="day-chevron">&#9658;</span>' +
            '</div>' +
            '<div class="day-body" id="day-body-' + d + '"></div>';
        weekGrid.appendChild(dayRow);

        const bodyEl = dayRow.querySelector('.day-body');
        if (isRest) {
            bodyEl.innerHTML = '<div style="font-family:\'Courier New\',monospace;font-size:12px;color:#555;padding:6px 0;">Active recovery: light walk, stretching, or complete rest. Sleep 7–9 hours.</div>';
        } else {
            const exList = document.createElement('div');
            exList.className = 'exercise-list';
            session.exs.forEach((key, i) => {
                const ex = EXERCISES[key];
                if (!ex) return;
                const row = document.createElement('div');
                row.className = 'ex-row';
                row.innerHTML =
                    '<span class="ex-num">' + (i+1) + '</span>' +
                    '<span class="ex-name">' + ex.name + '</span>' +
                    '<span class="ex-sets">' + ex.sets + ' × ' + ex.reps + '</span>' +
                    '<span class="ex-note">' + ex.note + (adj.repsNote && i===0 ? ' · ' + adj.repsNote : '') + '</span>';
                exList.appendChild(row);
            });
            bodyEl.appendChild(exList);
            dayIdx++;
        }
    }

    document.getElementById('plan-output').style.display = '';
    document.getElementById('plan-output').scrollIntoView({ behavior:'smooth', block:'start' });
}

function toggleDay(header) {
    const body    = header.nextElementSibling;
    const open    = body.classList.toggle('open');
    const chevron = header.querySelector('.day-chevron');
    if (chevron) chevron.innerHTML = open ? '&#9660;' : '&#9658;';
}

// ════════════════════════════════════════════════════════════════════════
// CALCULATORS
// ════════════════════════════════════════════════════════════════════════
function calcBMI() {
    const w = parseFloat(document.getElementById('bmi-weight').value);
    const h = parseFloat(document.getElementById('bmi-height').value);
    const el = document.getElementById('bmi-result');
    if (!w || !h) { el.innerHTML = '<span style="color:#e74c3c">Enter both fields.</span>'; return; }
    const weightKg = w * 0.453592;
    const heightM  = h * 0.0254;
    const bmi      = (weightKg / (heightM * heightM)).toFixed(1);
    const cat      = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Healthy weight' : bmi < 30 ? 'Overweight' : 'Obese';
    const col      = bmi < 18.5 ? '#42a5f5' : bmi < 25 ? '#4caf50' : bmi < 30 ? '#f4a261' : '#e74c3c';
    el.innerHTML   = '<strong style="font-size:22px;color:' + col + '">' + bmi + '</strong>&nbsp;<small>' + cat + '</small>';
}

function calcTDEE() {
    const w  = parseFloat(document.getElementById('tdee-weight').value);
    const h  = parseFloat(document.getElementById('tdee-height').value);
    const a  = parseInt(document.getElementById('tdee-age').value);
    const s  = document.getElementById('tdee-sex').value;
    const ac = parseFloat(document.getElementById('tdee-activity').value);
    const el = document.getElementById('tdee-result');
    if (!w || !h || !a) { el.innerHTML = '<span style="color:#e74c3c">Enter all fields.</span>'; return; }
    const kg  = w * 0.453592;
    const cm  = h * 2.54;
    const bmr = s === 'm'
        ? (10 * kg) + (6.25 * cm) - (5 * a) + 5
        : (10 * kg) + (6.25 * cm) - (5 * a) - 161;
    const tdee = Math.round(bmr * ac);
    el.innerHTML = '<strong style="font-size:22px">' + tdee.toLocaleString() + '</strong>&nbsp;<small>kcal / day &nbsp;·&nbsp; BMR: ' + Math.round(bmr).toLocaleString() + ' kcal</small>';
}

function calcMacros() {
    const cals = parseInt(document.getElementById('mac-cals').value);
    const goal = document.getElementById('mac-goal').value;
    const el   = document.getElementById('mac-result');
    if (!cals || cals < 800) { el.innerHTML = '<span style="color:#e74c3c">Enter a valid calorie target.</span>'; return; }
    const splits = {
        lose:      { p:0.40, c:0.35, f:0.25 },
        gain:      { p:0.30, c:0.45, f:0.25 },
        maintain:  { p:0.30, c:0.40, f:0.30 },
        endurance: { p:0.25, c:0.55, f:0.20 },
    }[goal];
    const p = Math.round((cals * splits.p) / 4);
    const c = Math.round((cals * splits.c) / 4);
    const f = Math.round((cals * splits.f) / 9);
    el.innerHTML =
        '<span style="color:#f4a261">Protein: <strong>' + p + 'g</strong></span>&nbsp;&nbsp;' +
        '<span style="color:#42a5f5">Carbs: <strong>' + c + 'g</strong></span>&nbsp;&nbsp;' +
        '<span style="color:#ab47bc">Fat: <strong>' + f + 'g</strong></span>';
}

function calcIdealWeight() {
    const ft    = parseInt(document.getElementById('iw-ft').value) || 0;
    const inches= parseInt(document.getElementById('iw-in').value) || 0;
    const frame = document.getElementById('iw-frame').value;
    const el    = document.getElementById('iw-result');
    const totalIn = (ft * 12) + inches;
    if (!totalIn) { el.innerHTML = '<span style="color:#e74c3c">Enter your height.</span>'; return; }
    // Hamwi formula base: 5ft = 106 lb (m) / 100 lb (f), +6/+5 per inch over 5ft
    const base  = 5 * 12;
    const extra = Math.max(0, totalIn - base);
    const midM  = 106 + extra * 6;
    const adj   = frame === 'small' ? -0.10 : frame === 'large' ? 0.10 : 0;
    const loLb  = Math.round(midM * (1 - 0.15 + adj));
    const hiLb  = Math.round(midM * (1 + 0.15 + adj));
    const loKg  = (loLb * 0.453592).toFixed(0);
    const hiKg  = (hiLb * 0.453592).toFixed(0);
    el.innerHTML = '<strong style="font-size:18px">' + loLb + '–' + hiLb + ' lbs</strong>&nbsp;<small>(' + loKg + '–' + hiKg + ' kg) &nbsp;' + frame + ' frame</small>';
}

// ════════════════════════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════════════════════════
buildInfoGrid('macro-grid', MACRO_CARDS);
buildInfoGrid('micro-grid', MICRO_CARDS);
buildFoodTable('protein-table',
    ['Food', 'Protein', 'Calories (100g)', 'Notes'],
    PROTEIN_TABLE_DATA);
buildFoodTable('carb-table',
    ['Food', 'Carbs / Fat', 'Calories', 'Notes'],
    CARB_TABLE_DATA);
setUnits('imperial');
