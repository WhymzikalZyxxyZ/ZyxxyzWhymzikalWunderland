// ── DATA ─────────────────────────────────────────────────────────────────────

    const MODULES = {
        foundations: [
            {
                icon: '🧭', title: 'Anatomical Terminology',
                module: 'Foundations',
                body: `Standard directional and positional terms allow precise communication regardless of patient position.
                <ul>
                    <li><strong>Anatomical position:</strong> Standing upright, facing forward, arms at sides, palms forward. All directional terms reference this position.</li>
                    <li><strong>Superior / Inferior:</strong> Toward the head / toward the feet. The nose is superior to the chin.</li>
                    <li><strong>Anterior / Posterior:</strong> Front / back. The sternum is anterior; the spine is posterior.</li>
                    <li><strong>Medial / Lateral:</strong> Toward the midline / away from it. The nose is medial to the eyes.</li>
                    <li><strong>Proximal / Distal:</strong> Closer to / further from the point of attachment. The elbow is proximal to the wrist.</li>
                    <li><strong>Planes:</strong> Sagittal (divides left/right), coronal/frontal (divides front/back), transverse/axial (divides top/bottom).</li>
                    <li><strong>Body cavities:</strong> Cranial, spinal, thoracic (contains heart and lungs), abdominal, pelvic.</li>
                </ul>`
            },
            {
                icon: '🔢', title: 'Body Regions & Surface Landmarks',
                module: 'Foundations',
                body: `Surface landmarks allow EMTs to identify underlying structures without imaging.
                <ul>
                    <li><strong>Head:</strong> Frontal, parietal, temporal, occipital bones. Fontanelles are open in infants — a bulging fontanelle suggests increased ICP.</li>
                    <li><strong>Neck:</strong> Trachea (midline), carotid arteries (lateral), jugular veins. JVD (jugular venous distension) suggests tension pneumothorax or cardiac tamponade.</li>
                    <li><strong>Thorax:</strong> Clavicles, sternum, ribs 1–12. MCL (midclavicular line) and MAL (midaxillary line) are reference lines for auscultation and needle decompression.</li>
                    <li><strong>Abdomen:</strong> Divided into 4 quadrants (RUQ, LUQ, RLQ, LLQ) or 9 regions. McBurney's point (RLQ) — tenderness suggests appendicitis.</li>
                    <li><strong>Pelvis:</strong> Iliac crests, pubic symphysis. Compression test assesses pelvic fracture.</li>
                    <li><strong>Extremities:</strong> Assess CSM — Circulation (pulse, cap refill), Sensation, Movement — distal to any injury.</li>
                </ul>`
            },
            {
                icon: '🩺', title: 'Patient Assessment Overview',
                module: 'Foundations',
                body: `The structured assessment sequence ensures no life threat is missed and guides all clinical decisions.
                <ul>
                    <li><strong>Scene size-up:</strong> BSI (gloves, mask, eye protection), scene safety, MOI/NOI, number of patients, need for additional resources.</li>
                    <li><strong>Primary survey (ABCDE):</strong> Airway → Breathing → Circulation → Disability (neuro) → Expose/Environment. Find and fix immediate life threats.</li>
                    <li><strong>Secondary survey:</strong> Head-to-toe physical exam, SAMPLE history, vital signs, OPQRST for chief complaint.</li>
                    <li><strong>Reassessment:</strong> Repeat every 5 min (unstable) or 15 min (stable). Trend vital signs — deterioration may be subtle.</li>
                    <li><strong>AVPU scale:</strong> Alert, responds to Voice, responds to Pain, Unresponsive. Quick neuro baseline before GCS.</li>
                    <li><strong>Transport decision:</strong> Load-and-go (critical patients) vs stay-and-play (stable patients who benefit from on-scene treatment).</li>
                </ul>`
            },
        ],
        systems: [
            {
                icon: '❤️', title: 'Cardiovascular System',
                module: 'Body Systems',
                body: `The heart and vascular system — the most time-critical system in emergency medicine.
                <ul>
                    <li><strong>Heart anatomy:</strong> 4 chambers — right atrium/ventricle (pulmonary circuit), left atrium/ventricle (systemic circuit). Valves: tricuspid, pulmonary, mitral, aortic.</li>
                    <li><strong>Conduction system:</strong> SA node (pacemaker, 60–100 bpm) → AV node → Bundle of His → Purkinje fibres. Generates the ECG waveform.</li>
                    <li><strong>Cardiac output:</strong> CO = Heart Rate × Stroke Volume. Normal ~5 L/min. Shock = inadequate CO for tissue perfusion.</li>
                    <li><strong>ACS (Acute Coronary Syndrome):</strong> Includes unstable angina, NSTEMI, STEMI. Caused by plaque rupture and coronary artery occlusion. Time-critical — door-to-balloon &lt;90 min for STEMI.</li>
                    <li><strong>EMT interventions:</strong> 12-lead ECG (if scope permits), aspirin 324 mg chewed, oxygen if SpO₂ &lt;94%, nitroglycerin with medical direction, rapid transport.</li>
                    <li><strong>Cardiac arrest rhythms:</strong> VF and pulseless VT are shockable (defibrillate). PEA and asystole are non-shockable (CPR + treat reversible causes).</li>
                </ul>`
            },
            {
                icon: '🫁', title: 'Respiratory System',
                module: 'Body Systems',
                body: `The airway is always the first priority — hypoxia kills faster than any other insult.
                <ul>
                    <li><strong>Upper airway:</strong> Nose/mouth → nasopharynx/oropharynx → larynx (vocal cords) → trachea. The epiglottis protects the airway during swallowing.</li>
                    <li><strong>Lower airway:</strong> Trachea → mainstem bronchi (right is wider and more vertical — foreign bodies go here) → bronchioles → alveoli.</li>
                    <li><strong>Gas exchange:</strong> O₂ and CO₂ diffuse across the alveolar-capillary membrane. PaO₂ drives oxygen into blood; PaCO₂ drives ventilation rate.</li>
                    <li><strong>Work of breathing:</strong> Accessory muscle use, nasal flaring, tracheal tugging, intercostal/subcostal retractions all indicate increased WOB — a red flag.</li>
                    <li><strong>Airway adjuncts:</strong> OPA (unconscious, no gag reflex), NPA (conscious/semiconscious, any gag status). BVM delivers ~500 mL tidal volume at 10–12 breaths/min.</li>
                    <li><strong>Abnormal breath sounds:</strong> Wheezes (bronchospasm — asthma), crackles/rales (fluid — pulmonary oedema), rhonchi (secretions), stridor (upper airway obstruction — act fast).</li>
                </ul>`
            },
            {
                icon: '🧠', title: 'Nervous System',
                module: 'Body Systems',
                body: `The CNS controls all body functions and is exquisitely sensitive to hypoxia and trauma.
                <ul>
                    <li><strong>Central nervous system:</strong> Brain (cerebrum, cerebellum, brainstem) + spinal cord. Protected by skull and vertebral column. The brainstem controls breathing and heart rate — brainstem herniation is fatal.</li>
                    <li><strong>Peripheral nervous system:</strong> 31 pairs of spinal nerves. Sensory (afferent) and motor (efferent) pathways.</li>
                    <li><strong>Autonomic NS:</strong> Sympathetic ("fight or flight" — ↑HR, ↑BP, bronchodilation) vs parasympathetic ("rest and digest" — ↓HR, ↑GI motility).</li>
                    <li><strong>Stroke recognition — FAST:</strong> Face drooping, Arm weakness, Speech difficulty, Time to call 911. Also: sudden severe headache, vision changes, ataxia.</li>
                    <li><strong>Spinal cord injury:</strong> Treat all unconscious trauma patients as having a spinal injury. Log roll with manual C-spine. Neurogenic shock: bradycardia + hypotension (no compensatory tachycardia).</li>
                    <li><strong>Cushing's triad (raised ICP):</strong> Hypertension + bradycardia + irregular respirations. Late and ominous sign — patient is decompensating. Immediate transport.</li>
                </ul>`
            },
            {
                icon: '🦴', title: 'Musculoskeletal System',
                module: 'Body Systems',
                body: `206 bones and associated muscles, tendons, and ligaments form the framework for movement and protection.
                <ul>
                    <li><strong>Axial skeleton:</strong> Skull, vertebral column (7 cervical, 12 thoracic, 5 lumbar, sacrum, coccyx), sternum, ribs. Protects CNS and thoracic organs.</li>
                    <li><strong>Appendicular skeleton:</strong> Pectoral girdle (clavicle, scapula), upper limbs, pelvic girdle, lower limbs.</li>
                    <li><strong>Fracture assessment:</strong> Deformity, Contusions, Abrasions, Puncture/Penetration, Burns, Tenderness, Lacerations, Swelling (DCAP-BTLS). Assess CSM distal to injury before and after splinting.</li>
                    <li><strong>Femur fractures:</strong> Can lose 500–1500 mL of blood into the thigh. Traction splint (e.g. Hare or Sager) reduces pain and blood loss for mid-shaft femur fractures.</li>
                    <li><strong>Pelvic fractures:</strong> Life-threatening internal haemorrhage. Apply pelvic binder, avoid repeat compression testing, and rapidly transport.</li>
                    <li><strong>Joint injuries:</strong> Sprains (ligament), strains (muscle/tendon), dislocations. Splint in position found — do not attempt to reduce dislocations in the field.</li>
                </ul>`
            },
            {
                icon: '🩸', title: 'Circulatory & Haemostasis',
                module: 'Body Systems',
                body: `Haemorrhage is the leading preventable cause of trauma death. Controlling it is a primary skill.
                <ul>
                    <li><strong>Blood components:</strong> RBCs (oxygen transport), WBCs (immunity), platelets (clotting), plasma (volume). Normal blood volume ~70 mL/kg (adult ~5 L).</li>
                    <li><strong>Haemorrhage control — MARCH:</strong> Massive haemorrhage first → Airway → Respirations → Circulation → Hypothermia prevention.</li>
                    <li><strong>Direct pressure:</strong> Firm, sustained pressure with gauze. Do not remove — add more gauze if soaked. Wound packing for junctional/deep wounds.</li>
                    <li><strong>Tourniquets:</strong> Apply 2–3 inches proximal to wound. Tighten until bleeding stops. Note time. Never remove in field. Effective for extremity haemorrhage.</li>
                    <li><strong>Haemostatic agents:</strong> Combat gauze (kaolin-impregnated), QuikClot. Used for wounds not amenable to tourniquet.</li>
                    <li><strong>Shock:</strong> Inadequate tissue perfusion. Types — hypovolaemic (most common), distributive (septic, neurogenic, anaphylactic), cardiogenic, obstructive (tension PTX, tamponade).</li>
                </ul>`
            },
            {
                icon: '🏥', title: 'Integumentary & Soft Tissue',
                module: 'Body Systems',
                body: `The skin is the body's largest organ and provides important clues about systemic conditions.
                <ul>
                    <li><strong>Skin assessment:</strong> Colour (pale = poor perfusion; cyanosis = hypoxia; jaundice = liver; flushed = fever/vasodilation), Temperature (cool = shock; hot = fever/heat stroke), Condition (diaphoresis = sympathetic activation).</li>
                    <li><strong>Wound types:</strong> Abrasion (superficial), laceration (jagged cut), incision (clean cut), avulsion (flap of skin/tissue), amputation, puncture, impaled object.</li>
                    <li><strong>Impaled objects:</strong> Never remove. Stabilise in place with bulky dressings. Exception: object impaled in cheek obstructing airway.</li>
                    <li><strong>Evisceration:</strong> Abdominal organs extruding from wound. Cover with moist sterile dressing; do not push organs back in.</li>
                    <li><strong>Burns — classification:</strong> Superficial (redness, dry), Partial thickness (blisters, moist, painful), Full thickness (leathery, waxy, painless — nerve destruction).</li>
                    <li><strong>Burn management:</strong> Stop burning process, cool with room-temp water (not ice), cover with dry sterile dressing, establish IV, monitor airway (inhalation injury risk).</li>
                </ul>`
            },
        ],
        trauma: [
            {
                icon: '🚨', title: 'Trauma Assessment (ITLS/PHTLS)',
                module: 'Trauma',
                body: `Systematic approach to the trauma patient minimises missed injuries and optimises survival.
                <ul>
                    <li><strong>Scene size-up:</strong> MOI (mechanism of injury) predicts injury patterns. High-speed MVC → spine, chest, abdomen. Fall from height → calcaneus, spine, femur, wrists. Penetrating → local + trajectory.</li>
                    <li><strong>Primary survey:</strong> C-spine control → Airway → Breathing (rate, effort, lung sounds, tracheal deviation, JVD) → Circulation (pulse, skin, major haemorrhage) → Disability (AVPU/GCS, pupils) → Expose.</li>
                    <li><strong>Critical findings requiring immediate transport:</strong> Airway obstruction, tension pneumothorax, open chest wound, flail chest, massive haemorrhage, evisceration, GCS &lt;14, signs of shock.</li>
                    <li><strong>Rapid trauma exam:</strong> Head → neck → chest → abdomen → pelvis → extremities → posterior. DCAP-BTLS at each region. Complete in &lt;90 seconds.</li>
                    <li><strong>Packaging:</strong> Long spine board (if indicated), cervical collar, head blocks and tape for unconscious or high-risk MOI patients. Trend away from routine spinal immobilisation — use clinical criteria (NEXUS).</li>
                    <li><strong>Golden hour / Platinum 10:</strong> Goal is definitive care within 1 hour of injury. Scene time ideally &lt;10 min for critical trauma.</li>
                </ul>`
            },
            {
                icon: '🫀', title: 'Chest Trauma',
                module: 'Trauma',
                body: `Thoracic injuries can kill quickly — recognise and treat in the primary survey.
                <ul>
                    <li><strong>Tension pneumothorax:</strong> Air accumulates in pleural space → lung collapses → mediastinum shifts → kinks great vessels → obstructive shock. Signs: absent breath sounds (ipsilateral), tracheal deviation (late), JVD, hypotension, hypoxia. Treatment: needle decompression at 2nd ICS MCL or 4th/5th ICS MAL (BLS scope in some systems).</li>
                    <li><strong>Open pneumothorax (sucking chest wound):</strong> Air enters through chest wall defect. Cover with 3-sided occlusive dressing (allows air to exit but not enter). Monitor for tension PTX.</li>
                    <li><strong>Haemothorax:</strong> Blood in pleural space. Can lose 1500–3000 mL. Signs: absent breath sounds, dull to percussion, hypotension. Treatment: IV fluids, hospital for chest drain.</li>
                    <li><strong>Flail chest:</strong> ≥3 consecutive ribs fractured in ≥2 places → paradoxical movement. Severe pain inhibits breathing. BVM ventilation, pain management (ALS), hospital.</li>
                    <li><strong>Cardiac tamponade:</strong> Blood in pericardial sac → compresses heart. Beck's triad: JVD + hypotension + muffled heart sounds. Requires pericardiocentesis at hospital.</li>
                    <li><strong>Aortic injury:</strong> High-energy deceleration MOI. Often rapidly fatal. Suspect in high-speed MVCs with widened mediastinum on CXR. Rapid transport.</li>
                </ul>`
            },
            {
                icon: '🤕', title: 'Head Trauma (TBI)',
                module: 'Trauma',
                body: `Traumatic brain injury is a leading cause of trauma mortality and long-term disability.
                <ul>
                    <li><strong>Mechanism:</strong> Primary injury (direct trauma) is irreversible. Secondary injury (hypoxia, hypotension, oedema, seizures) is preventable — this is where EMT care matters.</li>
                    <li><strong>Hypotension kills:</strong> Every episode of SBP &lt;90 mmHg in a TBI patient roughly doubles mortality. Maintain SBP ≥90 mmHg aggressively.</li>
                    <li><strong>Hypoxia kills:</strong> Maintain SpO₂ ≥94%. Avoid hyperventilation (↓CO₂ → vasoconstriction → ↓CBF) except for herniation (GCS ≤8 + dilated pupil + posturing).</li>
                    <li><strong>Epidural haematoma:</strong> Arterial bleed (middle meningeal artery). Classic lucid interval — patient is alert then deteriorates. Surgical emergency.</li>
                    <li><strong>Subdural haematoma:</strong> Venous bleed (bridging veins). More common in elderly and alcoholics. Slower onset. GCS decline over hours to days.</li>
                    <li><strong>Concussion:</strong> Mild TBI. Transient LOC or confusion, headache, amnesia. No structural damage on CT. Rest, monitor for deterioration.</li>
                </ul>`
            },
        ],
        medical: [
            {
                icon: '💉', title: 'Diabetic Emergencies',
                module: 'Medical',
                body: `Blood glucose disturbances are common, treatable, and dangerous if missed.
                <ul>
                    <li><strong>Hypoglycaemia (&lt;70 mg/dL):</strong> Most common emergency. Rapid onset. Signs: diaphoresis, trembling, anxiety, tachycardia, confusion, seizures. Can mimic stroke.</li>
                    <li><strong>Treatment (alert patient):</strong> Oral glucose 15–25 g (glucose tablets, orange juice, regular soda). Recheck BGL in 15 min.</li>
                    <li><strong>Treatment (unconscious/unable to swallow):</strong> ALS: dextrose IV (D50W 25 g), or glucagon 1 mg IM. BLS: position, airway, transport — do not give oral glucose.</li>
                    <li><strong>Hyperglycaemia:</strong> DKA (Type 1) or HHS (Type 2). Signs: polyuria, polydipsia, polyphagia, fruity breath (DKA), warm/dry skin, slow onset. Treatment: IV fluids, hospital for insulin.</li>
                    <li><strong>Rule of thumb:</strong> If in doubt and can't check BGL, treat for hypoglycaemia — glucose will not significantly harm a hyperglycaemic patient, but withholding it from a hypoglycaemic patient can cause brain death.</li>
                </ul>`
            },
            {
                icon: '🤧', title: 'Allergic Reactions & Anaphylaxis',
                module: 'Medical',
                body: `Anaphylaxis is a life-threatening systemic allergic reaction requiring immediate epinephrine.
                <ul>
                    <li><strong>Mild allergic reaction:</strong> Localised urticaria (hives), itching, mild angioedema. No systemic involvement. Antihistamines may be used (ALS).</li>
                    <li><strong>Anaphylaxis:</strong> Systemic reaction — two or more body systems involved. Triggers: food (nuts, shellfish), venom (bees), medications (penicillin, NSAIDs), latex.</li>
                    <li><strong>Signs:</strong> Skin (generalised urticaria, flushing), respiratory (stridor, wheezing, dyspnoea), cardiovascular (hypotension, tachycardia), GI (nausea, vomiting), neurological (dizziness, syncope).</li>
                    <li><strong>Treatment:</strong> Epinephrine 1:1000, 0.3 mg IM (anterolateral thigh) — this is the definitive treatment. Give immediately. Do not delay for antihistamines.</li>
                    <li><strong>Airway:</strong> Angioedema can close the airway rapidly. Have BVM ready. If intubation fails, surgical airway is the last resort (ALS).</li>
                    <li><strong>Secondary epinephrine:</strong> May repeat after 5–15 min if no improvement. Carry patient supine with legs elevated (unless respiratory compromise).</li>
                </ul>`
            },
            {
                icon: '⚡', title: 'Seizures',
                module: 'Medical',
                body: `Seizures result from abnormal electrical activity in the brain. Most are self-limiting but some are emergencies.
                <ul>
                    <li><strong>Types:</strong> Generalised tonic-clonic (grand mal) — stiffening then jerking, LOC. Absence (petit mal) — brief staring spell. Focal — one body area. Status epilepticus — seizure &gt;5 min or repeated without recovery.</li>
                    <li><strong>Causes:</strong> Epilepsy, hypoglycaemia, hypoxia, head trauma, stroke, hyponatraemia, fever (paediatric), drug/alcohol withdrawal, eclampsia (pregnancy).</li>
                    <li><strong>During seizure:</strong> Protect from injury, position on side (recovery position after), do not restrain, do not put anything in mouth, suction if needed, time duration, BGL check.</li>
                    <li><strong>Post-ictal phase:</strong> Confusion, exhaustion lasting minutes to hours. Normal — but reassess to ensure recovery.</li>
                    <li><strong>Status epilepticus:</strong> Medical emergency. ALS: benzodiazepines (diazepam, lorazepam, midazolam). BLS: airway, O₂, rapid transport.</li>
                    <li><strong>Red flags:</strong> First seizure ever, focal deficit, fever + stiff neck, pregnancy, prolonged LOC, no recovery — transport all seizure patients.</li>
                </ul>`
            },
            {
                icon: '💊', title: 'Overdose & Poisoning',
                module: 'Medical',
                body: `Toxicological emergencies require recognising toxidromes — patterns of signs and symptoms that identify the drug class.
                <ul>
                    <li><strong>Opioid toxidrome:</strong> Miosis (pinpoint pupils), CNS depression, respiratory depression. Treat: naloxone 0.4–2 mg IN/IM. Goal is adequate breathing, not full reversal.</li>
                    <li><strong>Sympathomimetic toxidrome (cocaine, meth):</strong> Mydriasis, tachycardia, hypertension, hyperthermia, agitation, diaphoresis. Treat: cooling, benzodiazepines (ALS), supportive care.</li>
                    <li><strong>Cholinergic toxidrome (organophosphates, nerve agents):</strong> SLUDGE — Salivation, Lacrimation, Urination, Defaecation, GI distress, Emesis. Also: bronchospasm, bradycardia. Treat: atropine (ALS).</li>
                    <li><strong>Sedative-hypnotic (alcohol, benzodiazepines, barbiturates):</strong> CNS depression, slurred speech, ataxia, respiratory depression. Supportive airway management.</li>
                    <li><strong>Carbon monoxide:</strong> Cherry-red skin (late and unreliable). Headache, confusion, syncope. SpO₂ falsely normal — CO-oximetry needed. Treat: high-flow O₂ via NRB, consider hyperbaric O₂.</li>
                    <li><strong>General approach:</strong> Remove from exposure, airway/breathing support, contact Poison Control (1-800-222-1222 USA), transport with substance container if possible.</li>
                </ul>`
            },
            {
                icon: '🌡️', title: 'Environmental Emergencies',
                module: 'Medical',
                body: `Temperature-related emergencies are common and highly preventable.
                <ul>
                    <li><strong>Heat exhaustion:</strong> Heavy sweating, pale/moist skin, weakness, nausea, headache. Core temp normal or mildly elevated. Treatment: move to cool environment, supine + elevated legs, oral fluids (if alert), fan/cool packs to neck/groin/axilla.</li>
                    <li><strong>Heat stroke:</strong> Core temp &gt;40°C (104°F). Hot skin (often dry in classic; may be moist in exertional). Confusion, seizures, LOC. Life-threatening — aggressive cooling is treatment. Cool first, transport second.</li>
                    <li><strong>Hypothermia:</strong> Core temp &lt;35°C. Mild (32–35°C): shivering, confusion. Moderate (28–32°C): cardiac arrhythmias, no shivering. Severe (&lt;28°C): VF risk, apparent death. Handle gently — movement can trigger VF. Remove wet clothing, insulate, warm IV fluids (ALS).</li>
                    <li><strong>Frostbite:</strong> Localised freezing of tissue. Superficial: red/blanched, painful. Deep: hard, waxy, painless. Do not rub or re-warm in field if refreezing is possible. Protect from further injury.</li>
                    <li><strong>Drowning:</strong> Submit CPR immediately for any submersion victim without pulse. Cold-water drowning may be survivable after prolonged submersion — continue resuscitation until hospital declaration.</li>
                </ul>`
            },
            {
                icon: '🤰', title: 'Obstetric Emergencies',
                module: 'Medical',
                body: `Childbirth and obstetric complications require specific skills and a calm, systematic approach.
                <ul>
                    <li><strong>Normal delivery:</strong> Support the head as it crowns, do not pull. Check for nuchal cord. Suction mouth then nose. Clamp and cut cord after pulsations stop (or per protocol). Dry and stimulate newborn.</li>
                    <li><strong>Apgar scoring:</strong> Assess at 1 and 5 minutes. Score 7–10: normal. 4–6: stimulation/O₂. 0–3: resuscitate. See Reference tab.</li>
                    <li><strong>Meconium:</strong> Green/black amniotic fluid = foetal distress. If baby is vigorous — routine care. If depressed — intubation and suctioning (ALS).</li>
                    <li><strong>Breech presentation:</strong> Buttocks/feet first. Allow delivery without pulling. If head does not deliver within 3 min, insert gloved hand to create airway (finger in mouth). Rapid transport.</li>
                    <li><strong>Prolapsed cord:</strong> Cord presents before baby. Elevate presenting part with gloved hand to relieve pressure; maintain until delivery. Knee-chest position. Do not push cord back. Immediate transport.</li>
                    <li><strong>Pre-eclampsia / eclampsia:</strong> Hypertension + proteinuria in pregnancy. Eclampsia = seizures. Magnesium sulphate (ALS). Dim lights, quiet environment, rapid transport.</li>
                    <li><strong>Post-partum haemorrhage:</strong> &gt;500 mL blood loss after delivery. Uterine massage, encourage breastfeeding (oxytocin release), IV fluids, transport.</li>
                </ul>`
            },
        ],
    };

    const PROTOCOLS = {
        assessment: [
            {
                title: 'SAMPLE History',
                steps: [
                    { n:'S', text:'<strong>Signs & Symptoms</strong> — What is the chief complaint? When did it start? What makes it better or worse?' },
                    { n:'A', text:'<strong>Allergies</strong> — Any known allergies to medications, food, or environment? What reaction?' },
                    { n:'M', text:'<strong>Medications</strong> — Prescribed, OTC, supplements, herbal, illicit drugs. Bring the pill bottles.' },
                    { n:'P', text:'<strong>Pertinent Past History</strong> — Relevant medical history, prior surgeries, hospitalisations.' },
                    { n:'L', text:'<strong>Last Oral Intake</strong> — When did the patient last eat or drink? Important for airway management and surgery.' },
                    { n:'E', text:'<strong>Events Leading Up</strong> — What was the patient doing when symptoms began? Any precipitating factors?' },
                ]
            },
            {
                title: 'OPQRST — Pain Assessment',
                steps: [
                    { n:'O', text:'<strong>Onset</strong> — When did the pain start? Sudden or gradual? What were you doing?' },
                    { n:'P', text:'<strong>Provocation / Palliation</strong> — What makes it worse? What makes it better? (Exertion, rest, position, food)' },
                    { n:'Q', text:'<strong>Quality</strong> — Describe the pain. Crushing, sharp, dull, burning, tearing, pressure?' },
                    { n:'R', text:'<strong>Region / Radiation</strong> — Where is it? Does it move anywhere? (Cardiac: left arm/jaw; aortic: back; renal: flank to groin)' },
                    { n:'S', text:'<strong>Severity</strong> — Rate 0–10. How does it compare to previous pain? Has it changed?' },
                    { n:'T', text:'<strong>Time / Trend</strong> — How long has it been present? Constant or intermittent? Getting better, worse, or same?' },
                ]
            },
            {
                title: 'Primary Survey — ABCDE',
                steps: [
                    { n:'A', text:'<strong>Airway</strong> — Is it open and patent? Any obstruction, stridor, or gurgling? Open with head-tilt/chin-lift or jaw-thrust (trauma). Insert OPA/NPA if needed.' },
                    { n:'B', text:'<strong>Breathing</strong> — Rate, depth, effort. Auscultate bilaterally. Look for tracheal deviation, JVD, retractions, abnormal sounds, SpO₂.' },
                    { n:'C', text:'<strong>Circulation</strong> — Pulse (rate, rhythm, quality). Skin (colour, temp, moisture). Cap refill. Control major haemorrhage.' },
                    { n:'D', text:'<strong>Disability</strong> — AVPU or GCS. Pupils (PERRL). BGL if altered mental status.' },
                    { n:'E', text:'<strong>Expose / Environment</strong> — Expose the patient to find all injuries. Prevent hypothermia — cover after assessment.' },
                ]
            },
        ],
        critical: [
            {
                title: 'Adult CPR (AHA BLS)',
                steps: [
                    { n:'1', text:'<strong>Scene safety</strong> — Ensure the scene is safe to approach.' },
                    { n:'2', text:'<strong>Responsiveness</strong> — Tap shoulders and shout. If no response, call for help + AED.' },
                    { n:'3', text:'<strong>Check pulse</strong> — Carotid pulse ≤10 seconds. No pulse → start CPR.' },
                    { n:'4', text:'<strong>Compressions</strong> — 100–120/min, 2–2.4 inches deep, full chest recoil, minimal interruptions.' },
                    { n:'5', text:'<strong>Ratio</strong> — 30:2 (1 or 2 rescuers, no advanced airway). Continuous compressions with advanced airway in place.' },
                    { n:'6', text:'<strong>AED</strong> — Attach and use as soon as available. Analyse and shock without delay. Resume CPR immediately after shock.' },
                    { n:'7', text:'<strong>2-minute cycles</strong> — Continue 2-min CPR cycles with AED reassessment. Switch compressors every 2 min to maintain quality.' },
                ]
            },
            {
                title: 'Anaphylaxis Management',
                steps: [
                    { n:'1', text:'<strong>Recognise</strong> — Two or more systems involved (skin + respiratory/cardiovascular/GI). Identify trigger if possible.' },
                    { n:'2', text:'<strong>Epinephrine first</strong> — 0.3 mg IM (1:1,000 solution) into anterolateral thigh. No contraindications in anaphylaxis.' },
                    { n:'3', text:'<strong>Position</strong> — Supine with legs elevated unless respiratory distress (sitting up).' },
                    { n:'4', text:'<strong>High-flow O₂</strong> — 15 L/min via NRB mask. Prepare BVM.' },
                    { n:'5', text:'<strong>Transport immediately</strong> — Call ahead. Repeat epinephrine after 5–15 min if no improvement.' },
                    { n:'6', text:'<strong>ALS interventions</strong> — IV access, fluid bolus (hypotension), albuterol (bronchospasm), diphenhydramine, methylprednisolone.' },
                ]
            },
            {
                title: 'Stroke Protocol (FAST + Cincinnati)',
                steps: [
                    { n:'1', text:'<strong>Facial droop</strong> — Ask patient to smile. One side drooping = abnormal.' },
                    { n:'2', text:'<strong>Arm drift</strong> — Extend both arms for 10 seconds eyes closed. One arm drifts = abnormal.' },
                    { n:'3', text:'<strong>Speech</strong> — "The sky is blue in Cincinnati." Slurred, wrong words, or no speech = abnormal.' },
                    { n:'4', text:'<strong>Time</strong> — Record exact onset time (or last known well). Critical for thrombolytics (window: 3–4.5 hrs).' },
                    { n:'5', text:'<strong>Transport to stroke centre</strong> — Pre-notify hospital. Position 30° head elevation. Avoid hypoglycaemia and hyperoxia. IV access.' },
                    { n:'6', text:'<strong>BGL check</strong> — Hypoglycaemia mimics stroke. Treat if &lt;70 mg/dL.' },
                ]
            },
            {
                title: 'Tension Pneumothorax',
                steps: [
                    { n:'1', text:'<strong>Recognise</strong> — Absent breath sounds (ipsilateral), hypoxia, tachycardia, hypotension, JVD, tracheal deviation (late sign).' },
                    { n:'2', text:'<strong>Confirm</strong> — Do not wait for X-ray. Clinical diagnosis in the field.' },
                    { n:'3', text:'<strong>Needle decompression (ALS)</strong> — 14-gauge needle at 2nd ICS, MCL (or 4th–5th ICS, MAL). Rush of air = confirmed.' },
                    { n:'4', text:'<strong>Post-decompression</strong> — Reassess breath sounds and vital signs. May need repeat decompression.' },
                    { n:'5', text:'<strong>BLS scope</strong> — High-flow O₂, BVM for respiratory failure, rapid transport — some systems allow needle decompression at BLS level.' },
                ]
            },
        ],
        mnemonics: [
            {
                title: 'DCAP-BTLS (Trauma Exam)',
                steps: [
                    { n:'D', text:'<strong>Deformities</strong> — Obvious angulation, asymmetry, or shortening.' },
                    { n:'C', text:'<strong>Contusions</strong> — Bruising (note: bruising over mastoid = Battle\'s sign, suggests basilar skull fracture).' },
                    { n:'A', text:'<strong>Abrasions</strong> — Superficial scrapes indicating contact point.' },
                    { n:'P', text:'<strong>Punctures / Penetrations</strong> — Entry and exit wounds. Log roll to check posterior.' },
                    { n:'B', text:'<strong>Burns</strong> — Degree, extent (rule of nines), circumferential (vascular compromise).' },
                    { n:'T', text:'<strong>Tenderness</strong> — Palpation pain. Guards or rigidity suggest intra-abdominal injury.' },
                    { n:'L', text:'<strong>Lacerations</strong> — Depth, length, active bleeding, underlying structure involvement.' },
                    { n:'S', text:'<strong>Swelling / Oedema</strong> — Localised (injury) vs bilateral lower extremity (CHF, DVT).' },
                ]
            },
            {
                title: 'MARCH (Tactical / Haemorrhage Control)',
                steps: [
                    { n:'M', text:'<strong>Massive Haemorrhage</strong> — Tourniquet, wound packing, pressure dressing. Address first — you bleed out before you asphyxiate.' },
                    { n:'A', text:'<strong>Airway</strong> — Open and maintain. NPA, chin-lift. Unconscious patients lose airway tone.' },
                    { n:'R', text:'<strong>Respirations</strong> — Assess rate and quality. Needle decompression for tension PTX. Seal open chest wounds.' },
                    { n:'C', text:'<strong>Circulation</strong> — IV/IO access, fluid resuscitation (permissive hypotension in penetrating trauma: SBP 80–90).' },
                    { n:'H', text:'<strong>Hypothermia / Hypoglycaemia / Head injury</strong> — Prevent heat loss (lethal triad: hypothermia + acidosis + coagulopathy). Check BGL. Protect C-spine.' },
                ]
            },
            {
                title: 'AEIOU-TIPS (Altered Mental Status)',
                steps: [
                    { n:'A', text:'<strong>Alcohol</strong> — Intoxication or withdrawal. Do not assume AMS is "just drunk."' },
                    { n:'E', text:'<strong>Epilepsy / Electrolytes</strong> — Post-ictal state, seizure disorder, hypo/hypernatraemia.' },
                    { n:'I', text:'<strong>Insulin</strong> — Hypoglycaemia or hyperglycaemia. Always check BGL in AMS.' },
                    { n:'O', text:'<strong>Overdose / Opiates</strong> — Consider toxidrome. Any unresponsive patient may benefit from naloxone trial.' },
                    { n:'U', text:'<strong>Uraemia</strong> — Renal failure causing toxic metabolite accumulation.' },
                    { n:'T', text:'<strong>Trauma / Temperature</strong> — Head injury (may be subtle), heat stroke, hypothermia.' },
                    { n:'I', text:'<strong>Infection</strong> — Sepsis, meningitis, encephalitis. Altered MS + fever = consider LP at hospital.' },
                    { n:'P', text:'<strong>Psychiatric / Psychogenic</strong> — Diagnosis of exclusion. Organic causes must be ruled out first.' },
                    { n:'S', text:'<strong>Stroke / Structural</strong> — CVA, intracranial haemorrhage, space-occupying lesion.' },
                ]
            },
        ],
    };

    const GLS_TERMS = [
        { term:'Triage',           cat:'Operations',   def:'The process of sorting patients by urgency. START triage: can walk? breathing? perfusion? mental status? → immediate/delayed/minor/deceased.' },
        { term:'MOI',              cat:'Operations',   def:'Mechanism of Injury. How the trauma occurred. High-energy MOI (high-speed MVC, fall >6m) predicts serious injury even without obvious signs.' },
        { term:'NOI',              cat:'Operations',   def:'Nature of Illness. The medical complaint or disease process causing the current emergency.' },
        { term:'BSI',              cat:'Operations',   def:'Body Substance Isolation. Precautions to prevent contact with blood and body fluids — gloves, eye protection, mask.' },
        { term:'Load-and-go',      cat:'Operations',   def:'Decision to rapidly transport a critical patient with treatment en route, rather than prolonging scene time.' },
        { term:'Medical direction',cat:'Operations',   def:'Physician oversight of EMT practice. Online (direct radio/phone) or offline (standing protocols). EMTs must act within the scope authorised by medical director.' },
        { term:'Perfusion',        cat:'Circulation',  def:'The delivery of oxygenated blood to tissues. Inadequate perfusion = shock. Assessed via skin colour/temp/moisture, cap refill, mental status.' },
        { term:'Shock',            cat:'Circulation',  def:'A state of inadequate tissue perfusion. Not simply low blood pressure — can exist with normal BP in early stages. Treat aggressively.' },
        { term:'Cardiac output',   cat:'Circulation',  def:'Heart rate × stroke volume. Normal ~5 L/min. Determines perfusion pressure. Reduced in cardiogenic shock and hypovolaemia.' },
        { term:'Preload',          cat:'Circulation',  def:'The volume of blood returning to the right heart (venous return). Reduced in hypovolaemia. Increased by fluid and leg elevation.' },
        { term:'Afterload',        cat:'Circulation',  def:'The resistance the heart must overcome to eject blood (systemic vascular resistance). Increased in hypertensive emergency.' },
        { term:'Hypoxia',          cat:'Respiration',  def:'Insufficient oxygen delivery to tissues. Causes altered mental status, cyanosis, tachycardia. Treat with supplemental oxygen.' },
        { term:'Hypoxaemia',       cat:'Respiration',  def:'Low oxygen partial pressure in arterial blood (PaO₂ <80 mmHg). SpO₂ <94% is the threshold for supplemental O₂ in most protocols.' },
        { term:'Tidal volume',     cat:'Respiration',  def:'Volume of air per breath. Normal ~500 mL at rest. BVM should deliver ~500–600 mL — avoid over-ventilation (raises intrathoracic pressure, reduces preload).' },
        { term:'Minute volume',    cat:'Respiration',  def:'Tidal volume × respiratory rate. Normal ~6–8 L/min. Determines CO₂ elimination — hyperventilation causes hypocapnia and cerebral vasoconstriction.' },
        { term:'Stridor',          cat:'Respiration',  def:'High-pitched inspiratory sound indicating partial upper airway obstruction (larynx, trachea). Immediate action required — can progress to complete obstruction.' },
        { term:'Diaphoresis',      cat:'Assessment',   def:'Profuse sweating. A sign of sympathetic nervous system activation — seen in AMI, hypoglycaemia, anxiety, and shock. Always significant.' },
        { term:'Cyanosis',         cat:'Assessment',   def:'Bluish discolouration of skin/mucous membranes from deoxygenated haemoglobin. Peripheral (extremities) precedes central (lips, tongue). Late sign of hypoxia.' },
        { term:'Diaphoresis',      cat:'Assessment',   def:'Profuse sweating — sympathetic activation marker seen in AMI, shock, hypoglycaemia.' },
        { term:'Jugular venous distension', cat:'Assessment', def:'Engorged jugular veins at 45° elevation. Indicates elevated right-heart pressure — right heart failure, tension pneumothorax, cardiac tamponade.' },
        { term:'Tracheal deviation',cat:'Assessment',  def:'Shift of trachea from midline. Pulled toward collapsed lung (atelectasis); pushed away from tension pneumothorax (late and sinister sign).' },
        { term:'Pupils (PERRL)',   cat:'Assessment',   def:'Pupils Equal and Round, Reactive to Light. Unilateral dilation: CN III compression (herniation). Bilateral dilation: sympathomimetics. Bilateral constriction (miosis): opioids, pontine lesion.' },
        { term:'Capillary refill', cat:'Assessment',   def:'Time for colour to return after blanching the nail bed. Normal <2 seconds. >2 sec suggests poor perfusion. Less reliable in cold environments.' },
        { term:'Pulse oximetry',   cat:'Assessment',   def:'Non-invasive measurement of haemoglobin oxygen saturation (SpO₂). Normal ≥95%. Unreliable in CO poisoning, poor perfusion, and nail polish.' },
        { term:'PEEP',             cat:'Airway',       def:'Positive End-Expiratory Pressure. Pressure maintained in airways at end of expiration. Improves oxygenation in pulmonary oedema. Valve can be added to BVM.' },
        { term:'Sellick\'s manoeuvre',cat:'Airway',    def:'Cricoid pressure applied during intubation to reduce aspiration risk. Controversial — may impair intubation view. Use per protocol.' },
        { term:'OPA',              cat:'Airway',       def:'Oropharyngeal Airway. Curved plastic adjunct that holds the tongue from occluding the pharynx. Only used in unconscious patients with no gag reflex.' },
        { term:'NPA',              cat:'Airway',       def:'Nasopharyngeal Airway. Soft rubber tube inserted through nostril to maintain airway patency. Can be used in conscious/semiconscious patients.' },
        { term:'CPAP',             cat:'Airway',       def:'Continuous Positive Airway Pressure. Delivers a constant pressure to keep alveoli open. Used in pulmonary oedema, COPD, and sleep apnoea.' },
        { term:'Sellick\'s',       cat:'Airway',       def:'Cricoid pressure — applied during intubation attempts to compress the oesophagus and reduce aspiration risk.' },
        { term:'AED',              cat:'Cardiac',      def:'Automated External Defibrillator. Analyses rhythm and delivers shock for VF/pulseless VT. Should be applied in <60 seconds of arrest recognition.' },
        { term:'VF',               cat:'Cardiac',      def:'Ventricular Fibrillation. Chaotic, disorganised ventricular electrical activity — produces no cardiac output. Primary shockable arrest rhythm.' },
        { term:'PEA',              cat:'Cardiac',      def:'Pulseless Electrical Activity. Organised electrical activity without a palpable pulse. Treat reversible causes (Hs & Ts): hypoxia, hypovolaemia, hypothermia, H⁺ (acidosis), hypo/hyperkalaemia, tension PTX, tamponade, toxins, thrombosis.' },
        { term:'STEMI',            cat:'Cardiac',      def:'ST-Elevation Myocardial Infarction. Complete coronary occlusion. Requires emergent PCI (stenting). Door-to-balloon time goal: <90 minutes.' },
        { term:'NSTEMI',           cat:'Cardiac',      def:'Non-ST-Elevation MI. Partial occlusion. Treated with anticoagulation and early PCI at hospital. Less time-critical than STEMI.' },
        { term:'Ischaemia',        cat:'Cardiac',      def:'Insufficient blood flow to tissue. Reversible if brief. Cardiac ischaemia causes chest pain and ECG changes. Progresses to infarction if prolonged.' },
        { term:'Pulmonary oedema', cat:'Pulmonary',    def:'Fluid in alveolar spaces, usually from left heart failure. Presents with dyspnoea, pink frothy sputum, crackles, orthopnoea. Treat with O₂, CPAP, nitrates, furosemide (ALS).' },
        { term:'Pneumothorax',     cat:'Pulmonary',    def:'Air in the pleural space causing lung collapse. Spontaneous (tall thin males), traumatic, or tension (life-threatening). Presents with pleuritic chest pain and dyspnoea.' },
        { term:'Pulmonary embolism',cat:'Pulmonary',   def:'Blood clot in pulmonary vasculature obstructing blood flow. Sudden dyspnoea, pleuritic chest pain, haemoptysis. Risk factors: DVT, immobility, malignancy, OCP.' },
        { term:'Haemostasis',      cat:'Bleeding',     def:'The process of stopping bleeding. Phases: vascular spasm → platelet plug → coagulation cascade. Disrupted in haemophilia, anticoagulant use, liver failure.' },
        { term:'Coagulopathy',     cat:'Bleeding',     def:'Impaired clotting. Occurs in massive haemorrhage, hypothermia, and acidosis (the lethal triad). Treat with blood products and warming.' },
        { term:'Epistaxis',        cat:'Bleeding',     def:'Nosebleed. Most are anterior (Little\'s area). Pinch soft part of nose for 10–15 min, lean forward. Posterior bleeds are more serious.' },
        { term:'Hypertensive emergency',cat:'Cardiac', def:'SBP >180 mmHg with end-organ damage (chest pain, headache, visual changes, altered MS, focal neuro deficits). Treat with antihypertensives (ALS), transport.' },
        { term:'Eclampsia',        cat:'OB/Gyn',       def:'Seizures in pregnancy, usually in setting of pre-eclampsia. Life-threatening for mother and foetus. MgSO₄ is drug of choice (ALS). Immediate delivery.' },
        { term:'Placenta praevia', cat:'OB/Gyn',       def:'Placenta implanted over cervical os. Presents with painless bright red third-trimester bleeding. Do not perform vaginal exam. Immediate transport.' },
        { term:'Abruptio placentae',cat:'OB/Gyn',      def:'Premature separation of placenta from uterine wall. Painful dark vaginal bleeding, rigid/tender uterus. Foetal and maternal emergency. Immediate transport.' },
        { term:'Sepsis',           cat:'Medical',      def:'Life-threatening organ dysfunction caused by a dysregulated response to infection. qSOFA: altered MS + RR >22 + SBP <100. Early IV fluids and antibiotics are key.' },
        { term:'Diabetic ketoacidosis',cat:'Medical',  def:'DKA: severe insulin deficiency causing hyperglycaemia, ketonaemia, and metabolic acidosis. Fruity breath, Kussmaul respirations, dehydration. IV fluids + insulin (hospital).' },
        { term:'Anaphylaxis',      cat:'Medical',      def:'Severe, life-threatening systemic allergic reaction. Requires immediate epinephrine. Delay causes airway oedema, refractory hypotension, and death.' },
    ];

    const ROADMAP_STEPS = [
        {
            title: '1. Prerequisites — Get Ready to Apply',
            body: `Before enrolling in an EMT course, meet the standard requirements.
            <ul>
                <li>Minimum age: <strong>17–18 years</strong> (varies by state).</li>
                <li><strong>High school diploma or GED</strong> typically required.</li>
                <li>Current <strong>CPR/BLS certification</strong> (AHA or Red Cross) — required before or during the course.</li>
                <li>Background check and immunisations (hepatitis B, MMR, Tdap, influenza) required for clinical rotations.</li>
                <li>Recommended prep: Review basic anatomy, learn medical terminology, shadow an EMS crew if possible.</li>
            </ul>`,
            certs: ['CPR/BLS (AHA)', 'First Aid']
        },
        {
            title: '2. EMT-Basic Certification',
            body: `The entry-level credential. Required for all higher levels.
            <ul>
                <li><strong>Training hours:</strong> 120–150 hours classroom + clinical + field internship.</li>
                <li><strong>Curriculum:</strong> Anatomy & physiology, patient assessment, airway management, CPR/AED, haemorrhage control, shock, trauma, medical emergencies, childbirth, paediatrics, geriatrics.</li>
                <li><strong>NREMT exam:</strong> National Registry of EMTs. Computer-adaptive test (70–120 questions) + practical skills stations. Pass rate ~70%.</li>
                <li><strong>Recertification:</strong> Every 2 years — 40 hours of continuing education including mandatory topics.</li>
                <li><strong>Scope of practice:</strong> Airway adjuncts (OPA/NPA), O₂, BVM, aspirin, oral glucose, naloxone, epinephrine (auto-injector), AED, splinting, wound care, childbirth.</li>
            </ul>`,
            certs: ['NREMT-EMT', 'State EMT License']
        },
        {
            title: '3. AEMT — Advanced EMT',
            body: `Bridge level between EMT-Basic and Paramedic. Adds limited ALS skills.
            <ul>
                <li><strong>Additional hours:</strong> ~200 hours beyond EMT-Basic.</li>
                <li><strong>Added skills:</strong> IV and IO vascular access, fluid administration, blood glucose monitoring, 12-lead ECG acquisition, additional medications (albuterol, nitrous oxide, some vasopressors).</li>
                <li><strong>NREMT AEMT exam:</strong> Computer-adaptive + skills stations.</li>
                <li><strong>Common in:</strong> Rural EMS systems where paramedic coverage is limited.</li>
            </ul>`,
            certs: ['NREMT-AEMT', 'State AEMT License']
        },
        {
            title: '4. Paramedic Certification',
            body: `The highest standard EMT level. Full ALS scope of practice.
            <ul>
                <li><strong>Training hours:</strong> 1,200–1,800 hours (associate's degree programmes are common).</li>
                <li><strong>Added skills:</strong> Endotracheal intubation, RSI (some systems), 12-lead ECG interpretation, manual defibrillation, cardiac pacing, advanced drug therapy (30+ medications), central line access (some systems), needle decompression, cricothyrotomy, advanced obstetrics.</li>
                <li><strong>NREMT Paramedic exam:</strong> Computer-adaptive (80–150 questions) + extensive practical evaluation.</li>
                <li><strong>Typical timeline:</strong> 1–2 years from EMT-Basic. Community college programmes award an Associate of Applied Science (AAS).</li>
            </ul>`,
            certs: ['NREMT-Paramedic', 'State Paramedic License', 'ACLS', 'PALS', 'PHTLS']
        },
        {
            title: '5. Specialty Certifications',
            body: `Advanced certifications that expand scope or demonstrate expertise in specific areas.
            <ul>
                <li><strong>ACLS:</strong> Advanced Cardiovascular Life Support — systematic management of cardiac arrest, post-resuscitation care, and acute coronary syndromes.</li>
                <li><strong>PALS:</strong> Paediatric Advanced Life Support — cardiac arrest and respiratory emergencies in infants and children.</li>
                <li><strong>PHTLS:</strong> Pre-Hospital Trauma Life Support — internationally recognised trauma assessment and management course.</li>
                <li><strong>ITLS:</strong> International Trauma Life Support — alternative to PHTLS.</li>
                <li><strong>AMLS:</strong> Advanced Medical Life Support — systematic approach to medical emergencies (alternative to ACLS/PALS for medical focus).</li>
                <li><strong>TCCC / TECC:</strong> Tactical Combat/Emergency Casualty Care — military-derived trauma care, foundational for tactical medicine.</li>
                <li><strong>FP-C / CCP-C:</strong> Flight Paramedic / Critical Care Paramedic — for air medical and inter-facility critical care transport.</li>
            </ul>`,
            certs: ['ACLS', 'PALS', 'PHTLS', 'ITLS', 'AMLS', 'TCCC/TECC', 'FP-C', 'CCP-C']
        },
        {
            title: '6. Career Pathways',
            body: `EMS is a gateway to many healthcare careers.
            <ul>
                <li><strong>Career EMT/Paramedic:</strong> Fire-based EMS (firefighter/paramedic combo), private ambulance, hospital-based EMS, critical care transport, air medical.</li>
                <li><strong>Nursing bridge:</strong> Many nursing programmes grant advanced standing to paramedics. LPN in 1 year, RN (ADN) in 2 years.</li>
                <li><strong>Physician Assistant:</strong> EMS experience is highly valued. Several programmes have EMT/paramedic tracks.</li>
                <li><strong>Emergency Medicine physician:</strong> Paramedic background provides strong clinical foundation for medical school.</li>
                <li><strong>EMS education:</strong> Become an EMT/paramedic instructor — requires instructor certification and field experience.</li>
                <li><strong>Tactical medicine:</strong> Law enforcement EMT/paramedic, SWAT medic, military 68W (Army medic) or corpsman (Navy/Marines).</li>
            </ul>`,
            certs: ['BSN / RN', 'PA-C', 'MD/DO', 'EMS Instructor']
        },
    ];

    // ── TAB SYSTEM ───────────────────────────────────────────────────────────────
    function showTab(id) {
        document.querySelectorAll('.med-tab-panel').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.med-tab').forEach(t => t.classList.remove('active'));
        document.getElementById('tab-' + id).classList.add('active');
        const tabs   = document.querySelectorAll('.med-tab');
        const labels = ['learn','protocols','glossary','reference','roadmap'];
        tabs[labels.indexOf(id)].classList.add('active');
    }

    // ── LEARN ────────────────────────────────────────────────────────────────────
    function buildLearn() {
        [
            ['foundations', MODULES.foundations],
            ['systems',     MODULES.systems],
            ['trauma',      MODULES.trauma],
            ['medical',     MODULES.medical],
        ].forEach(([section, mods]) => {
            const grid = document.getElementById('learn-' + section);
            mods.forEach(m => {
                const card = document.createElement('div');
                card.className = 'lesson-card';
                card.innerHTML = `
                    <div class="lesson-header">
                        <div class="lesson-icon">${m.icon}</div>
                        <div class="lesson-title">${m.title}</div>
                        <div class="lesson-toggle">▶</div>
                    </div>
                    <div class="lesson-body">
                        <div class="lesson-module-tag">${m.module}</div>
                        ${m.body}
                    </div>`;
                card.querySelector('.lesson-header').addEventListener('click', () => card.classList.toggle('open'));
                grid.appendChild(card);
            });
        });
    }

    // ── PROTOCOLS ────────────────────────────────────────────────────────────────
    function buildProtocols() {
        [
            ['proto-assessment', PROTOCOLS.assessment],
            ['proto-critical',   PROTOCOLS.critical],
            ['proto-mnemonics',  PROTOCOLS.mnemonics],
        ].forEach(([id, protos]) => {
            const grid = document.getElementById(id);
            protos.forEach(proto => {
                const card = document.createElement('div');
                card.className = 'protocol-card';
                const stepsHtml = proto.steps.map(s =>
                    `<div class="protocol-step">
                        <div class="protocol-num">${s.n}</div>
                        <div class="protocol-text">${s.text}</div>
                    </div>`
                ).join('');
                card.innerHTML = `<div class="protocol-title">${proto.title}</div>${stepsHtml}`;
                grid.appendChild(card);
            });
        });
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
            btn.onclick = () => {
                glsActiveCat = c;
                document.querySelectorAll('.gls-cat-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                filterGls();
            };
            catBar.appendChild(btn);
        });
        filterGls();
    }

    function filterGls() {
        const q    = document.getElementById('gls-search').value.toLowerCase().trim();
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
            card.innerHTML = `<div class="gls-term">${t.term}</div><div class="gls-cat-tag">${t.cat}</div><div class="gls-def">${t.def}</div>`;
            grid.appendChild(card);
        });
    }

    // ── ROADMAP ──────────────────────────────────────────────────────────────────
    function buildRoadmap() {
        const spine = document.getElementById('roadmap-steps');
        ROADMAP_STEPS.forEach(step => {
            const el = document.createElement('div');
            el.className = 'roadmap-step';
            const certHtml = step.certs.length
                ? `<div class="cert-row">${step.certs.map(c => `<span class="cert-badge">${c}</span>`).join('')}</div>`
                : '';
            el.innerHTML = `
                <div class="roadmap-step-title">${step.title}</div>
                <div class="roadmap-step-body">${step.body}${certHtml}</div>`;
            spine.appendChild(el);
        });
    }

    // ── INIT ─────────────────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        buildLearn();
        buildProtocols();
        buildGlossary();
        buildRoadmap();
    });
