'use strict';

// ─── CURRICULUM ───────────────────────────────────────────────────────────────
const CURRICULUM = [
  {
    id: 'lr', label: 'Logical Reasoning', color: '#ef9a9a',
    tagline: 'Evaluate arguments — the largest section of the LSAT',
    lessons: [
      {
        title: 'Anatomy of an Argument',
        body: 'Every Logical Reasoning stimulus contains a conclusion (the main claim) and one or more premises (the evidence offered in support). Locating the conclusion first — often signalled by "therefore," "thus," "hence," or "so" — structures your entire analysis. The premise indicators include "because," "since," "given that," and "as evidenced by."',
        practical: 'In court, a closing argument is pure conclusion-plus-premises. "My client is innocent [conclusion] because the forensic evidence places him elsewhere at the time of the crime [premise] and two credible witnesses corroborate his alibi [premise]." Identifying this structure lets a judge or opposing counsel spot where to attack.',
        example: 'Stimulus: "Sales of electric vehicles have risen every quarter for three years. Clearly, consumers prefer electric vehicles to gasoline cars."\nConclusion: Consumers prefer EVs.\nPremise: Sales have risen three years running.\nGap: Rising sales ≠ stated preference — consumers may be responding to subsidies, not preference.',
        formulas: ['Conclusion indicators: therefore / thus / so / hence / consequently', 'Premise indicators: because / since / given that / for / as evidenced by'],
        svg: `<svg viewBox="0 0 420 150" xmlns="http://www.w3.org/2000/svg">
  <rect width="420" height="150" fill="#0d0d12" rx="8"/>
  <rect x="20" y="20" width="160" height="50" rx="6" fill="#1a0d0d" stroke="#ef9a9a" stroke-width="1.5"/>
  <text x="100" y="40" text-anchor="middle" fill="#ef9a9a" font-size="10" font-family="monospace">PREMISE(S)</text>
  <text x="100" y="58" text-anchor="middle" fill="#ccc" font-size="10" font-family="monospace">Evidence / Facts</text>
  <rect x="240" y="20" width="160" height="50" rx="6" fill="#0d1a0d" stroke="#ef9a9a" stroke-width="1.5"/>
  <text x="320" y="40" text-anchor="middle" fill="#ef9a9a" font-size="10" font-family="monospace">CONCLUSION</text>
  <text x="320" y="58" text-anchor="middle" fill="#ccc" font-size="10" font-family="monospace">Main Claim</text>
  <line x1="180" y1="45" x2="238" y2="45" stroke="#ef9a9a" stroke-width="1.5" marker-end="url(#arr)"/>
  <defs><marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 Z" fill="#ef9a9a"/></marker></defs>
  <rect x="20" y="90" width="380" height="40" rx="6" fill="#111" stroke="#2a2a2a" stroke-width="1"/>
  <text x="210" y="106" text-anchor="middle" fill="#666" font-size="9" font-family="monospace">THE GAP (Assumption)</text>
  <text x="210" y="122" text-anchor="middle" fill="#888" font-size="9" font-family="monospace">Unstated belief that bridges premise → conclusion</text>
</svg>`
      },
      {
        title: 'Assumption Questions',
        body: 'An assumption is an unstated premise the argument requires to be true. "Necessary assumption" questions ask what must be true for the conclusion to hold. The Negation Test is the key tool: negate the candidate answer — if the negated version destroys the conclusion, the original is a necessary assumption.',
        practical: 'Contract law depends on identifying unstated assumptions. A warranty claim assumes the defect existed at the time of sale. Opposing counsel will negate that assumption — arguing the defect arose from misuse — which collapses the plaintiff\'s argument.',
        example: 'Argument: "This medication was approved after clinical trials. Therefore it is safe for general use."\nAssumption: The trial population is representative of the general population. Negate it: If the trials only tested healthy adults aged 18-40, the conclusion that it is safe "for general use" (including children, the elderly, the immunocompromised) does not follow.',
        formulas: ['Negation Test: negate the answer → if conclusion collapses, it\'s necessary', 'Sufficient assumption: answer alone guarantees the conclusion'],
        svg: `<svg viewBox="0 0 420 150" xmlns="http://www.w3.org/2000/svg">
  <rect width="420" height="150" fill="#0d0d12" rx="8"/>
  <rect x="20" y="20" width="110" height="40" rx="5" fill="#1a0d0d" stroke="#ef9a9a" stroke-width="1.2"/>
  <text x="75" y="44" text-anchor="middle" fill="#ef9a9a" font-size="10" font-family="monospace">Premise</text>
  <rect x="290" y="20" width="110" height="40" rx="5" fill="#0d0d1a" stroke="#ef9a9a" stroke-width="1.2"/>
  <text x="345" y="44" text-anchor="middle" fill="#ef9a9a" font-size="10" font-family="monospace">Conclusion</text>
  <line x1="130" y1="40" x2="188" y2="40" stroke="#333" stroke-width="1.5" stroke-dasharray="4,3"/>
  <line x1="232" y1="40" x2="288" y2="40" stroke="#333" stroke-width="1.5" stroke-dasharray="4,3"/>
  <rect x="188" y="20" width="44" height="40" rx="5" fill="#1a1500" stroke="#c8a96e" stroke-width="1.5"/>
  <text x="210" y="44" text-anchor="middle" fill="#c8a96e" font-size="9" font-family="monospace">GAP</text>
  <text x="210" y="100" text-anchor="middle" fill="#888" font-size="9" font-family="monospace">Negate the answer candidate:</text>
  <text x="210" y="116" text-anchor="middle" fill="#ef9a9a" font-size="9" font-family="monospace">Does the conclusion collapse? → Necessary assumption</text>
  <text x="210" y="132" text-anchor="middle" fill="#888" font-size="9" font-family="monospace">Does the answer alone guarantee conclusion? → Sufficient</text>
</svg>`
      },
      {
        title: 'Weaken &amp; Strengthen Questions',
        body: 'Weaken questions ask for information that makes the conclusion less likely to follow from the premises. Strengthen questions ask for information that makes it more likely. Both attack or shore up the assumption — the gap between premise and conclusion. An answer that is irrelevant to the assumption does nothing.',
        practical: 'Expert witnesses are hired to strengthen or weaken inferences. A defense expert in a product liability case strengthens the defendant\'s position by presenting evidence that negates the assumed causal link between the product and the injury.',
        example: 'Argument: "City X banned plastic bags and plastic bag litter fell 30%. Therefore banning plastic bags reduces litter."\nWeaken: Other cities that didn\'t ban bags also saw a 30% litter drop in the same period (suggests a confounding variable, not the ban).\nStrengthen: A study controlling for all other variables found plastic bag litter dropped only in cities with bans.',
        formulas: ['Weaken = attack the assumption or introduce a counter-cause', 'Strengthen = eliminate alternatives or support the assumption'],
        svg: `<svg viewBox="0 0 420 140" xmlns="http://www.w3.org/2000/svg">
  <rect width="420" height="140" fill="#0d0d12" rx="8"/>
  <rect x="155" y="15" width="110" height="35" rx="5" fill="#111" stroke="#ef9a9a" stroke-width="1.2"/>
  <text x="210" y="37" text-anchor="middle" fill="#ef9a9a" font-size="10" font-family="monospace">Conclusion</text>
  <rect x="20" y="90" width="160" height="35" rx="5" fill="#1a0808" stroke="#ef5350" stroke-width="1.2"/>
  <text x="100" y="108" text-anchor="middle" fill="#ef5350" font-size="9" font-family="monospace">WEAKEN</text>
  <text x="100" y="120" text-anchor="middle" fill="#888" font-size="8" font-family="monospace">Attack the assumption</text>
  <rect x="240" y="90" width="160" height="35" rx="5" fill="#081a08" stroke="#4caf50" stroke-width="1.2"/>
  <text x="320" y="108" text-anchor="middle" fill="#4caf50" font-size="9" font-family="monospace">STRENGTHEN</text>
  <text x="320" y="120" text-anchor="middle" fill="#888" font-size="8" font-family="monospace">Support the assumption</text>
  <line x1="140" y1="90" x2="195" y2="52" stroke="#ef5350" stroke-width="1.2" stroke-dasharray="3,3"/>
  <line x1="280" y1="90" x2="225" y2="52" stroke="#4caf50" stroke-width="1.2" stroke-dasharray="3,3"/>
</svg>`
      },
      {
        title: 'Flaw Questions',
        body: 'Flaw questions ask you to identify the logical error in an argument. Common flaws include: ad hominem (attacking the person rather than the argument), hasty generalisation (small sample to broad conclusion), false dilemma (only two options presented when others exist), circular reasoning (conclusion restates the premise), and correlation/causation confusion.',
        practical: 'Appellate courts frequently cite logical flaws in lower court reasoning. A conviction overturned for "insufficient evidence" often reflects a hasty generalisation: the trial court inferred guilt from too thin a basis. Identifying the flaw in the original reasoning is the core of the appellate brief.',
        example: 'Flawed argument: "We surveyed 50 customers who complained — 80% said service was poor. Therefore 80% of all our customers think service is poor." Flaw: Hasty generalisation / biased sample. Complainers are not representative of all customers.',
        formulas: ['Ad hominem', 'Hasty generalisation', 'False dilemma', 'Circular reasoning', 'Correlation ≠ causation', 'Appeal to authority / popularity'],
        svg: `<svg viewBox="0 0 420 140" xmlns="http://www.w3.org/2000/svg">
  <rect width="420" height="140" fill="#0d0d12" rx="8"/>
  <text x="210" y="22" text-anchor="middle" fill="#ef9a9a" font-size="11" font-family="monospace">Common LSAT Argument Flaws</text>
  <rect x="10" y="32" width="190" height="28" rx="5" fill="#111" stroke="#333" stroke-width="1"/>
  <text x="105" y="50" text-anchor="middle" fill="#ccc" font-size="9" font-family="monospace">Hasty generalisation</text>
  <rect x="220" y="32" width="190" height="28" rx="5" fill="#111" stroke="#333" stroke-width="1"/>
  <text x="315" y="50" text-anchor="middle" fill="#ccc" font-size="9" font-family="monospace">Correlation ≠ causation</text>
  <rect x="10" y="68" width="190" height="28" rx="5" fill="#111" stroke="#333" stroke-width="1"/>
  <text x="105" y="86" text-anchor="middle" fill="#ccc" font-size="9" font-family="monospace">False dilemma (A or B only)</text>
  <rect x="220" y="68" width="190" height="28" rx="5" fill="#111" stroke="#333" stroke-width="1"/>
  <text x="315" y="86" text-anchor="middle" fill="#ccc" font-size="9" font-family="monospace">Circular reasoning</text>
  <rect x="10" y="104" width="190" height="28" rx="5" fill="#111" stroke="#333" stroke-width="1"/>
  <text x="105" y="122" text-anchor="middle" fill="#ccc" font-size="9" font-family="monospace">Ad hominem (attack person)</text>
  <rect x="220" y="104" width="190" height="28" rx="5" fill="#111" stroke="#333" stroke-width="1"/>
  <text x="315" y="122" text-anchor="middle" fill="#ccc" font-size="9" font-family="monospace">Equivocation (shifting meaning)</text>
</svg>`
      },
      {
        title: 'Inference Questions',
        body: 'Inference questions ask what must be true (or is most strongly supported) given the statements in the stimulus. Unlike assumption questions, there is no argument to evaluate — the stimulus is a set of facts from which you draw a logical consequence. The correct answer follows necessarily; it does not introduce new information.',
        practical: 'Statutory interpretation requires inferring what a legislature must have intended from the text. Courts use the maxim expressio unius (naming some things implies the exclusion of others) — a form of inference. If a statute lists specific exceptions, courts infer that unlisted exceptions do not apply.',
        example: 'Stimulus: "All partners at the firm have at least ten years of experience. No associate has more than five years of experience."\nValid inference: No associate is a partner (follows necessarily from both statements).\nInvalid inference: Partners are better lawyers than associates (not logically entailed).',
        formulas: ['Must be true ≠ probably true ≠ could be true', 'Combine premises; do not import outside knowledge', 'Correct answer is the weakest defensible claim'],
        svg: `<svg viewBox="0 0 420 140" xmlns="http://www.w3.org/2000/svg">
  <rect width="420" height="140" fill="#0d0d12" rx="8"/>
  <ellipse cx="150" cy="70" rx="110" ry="50" fill="#111" stroke="#ef9a9a" stroke-width="1.5"/>
  <text x="150" y="62" text-anchor="middle" fill="#ef9a9a" font-size="9" font-family="monospace">Given Facts</text>
  <text x="150" y="76" text-anchor="middle" fill="#888" font-size="8" font-family="monospace">(stimulus statements)</text>
  <ellipse cx="290" cy="70" rx="110" ry="50" fill="#111" stroke="#c8a96e" stroke-width="1.5"/>
  <text x="310" y="62" text-anchor="middle" fill="#c8a96e" font-size="9" font-family="monospace">Must be True</text>
  <text x="310" y="76" text-anchor="middle" fill="#888" font-size="8" font-family="monospace">(valid inferences only)</text>
  <ellipse cx="218" cy="70" rx="36" ry="26" fill="#1a1500" stroke="#c8a96e" stroke-width="1.5"/>
  <text x="218" y="66" text-anchor="middle" fill="#c8a96e" font-size="8" font-family="monospace">overlap</text>
  <text x="218" y="78" text-anchor="middle" fill="#888" font-size="8" font-family="monospace">= answer</text>
  <text x="210" y="128" text-anchor="middle" fill="#555" font-size="9" font-family="monospace">Correct answer lives only in the overlap — entailed by the facts</text>
</svg>`
      },
      {
        title: 'Paradox &amp; Parallel Reasoning',
        body: 'Paradox (Resolve/Explain) questions present two facts that appear contradictory and ask you to find a statement that explains how both can be true. Parallel Reasoning questions ask you to identify an argument in the answer choices that has the same logical structure as the stimulus argument — including the same flaw if the original is flawed.',
        practical: 'Paradox resolution mirrors the detective process. Seemingly contradictory evidence at a crime scene (victim shows no sign of struggle, yet the door was locked from the inside) requires a hypothesis that explains both facts simultaneously. Parallel reasoning appears in precedent analysis: a new case is binding only if it has the same structure as the cited authority.',
        example: 'Paradox: "The town passed strict noise ordinances, yet complaints about noise doubled." Resolution: The ordinances empowered residents who previously felt helpless — so more people started reporting noise that had always existed.',
        formulas: ['Paradox: find a fact that makes both statements simultaneously true', 'Parallel: match logical form, not subject matter'],
        svg: `<svg viewBox="0 0 420 140" xmlns="http://www.w3.org/2000/svg">
  <rect width="420" height="140" fill="#0d0d12" rx="8"/>
  <rect x="20" y="20" width="155" height="44" rx="6" fill="#111" stroke="#ef9a9a" stroke-width="1.2"/>
  <text x="97" y="38" text-anchor="middle" fill="#ef9a9a" font-size="9" font-family="monospace">Fact A (true)</text>
  <text x="97" y="54" text-anchor="middle" fill="#888" font-size="8" font-family="monospace">Noise rules passed</text>
  <rect x="245" y="20" width="155" height="44" rx="6" fill="#111" stroke="#ef9a9a" stroke-width="1.2"/>
  <text x="322" y="38" text-anchor="middle" fill="#ef9a9a" font-size="9" font-family="monospace">Fact B (true)</text>
  <text x="322" y="54" text-anchor="middle" fill="#888" font-size="8" font-family="monospace">Complaints doubled</text>
  <text x="210" y="42" text-anchor="middle" fill="#555" font-size="14" font-family="monospace">?!</text>
  <rect x="60" y="90" width="300" height="36" rx="6" fill="#1a1500" stroke="#c8a96e" stroke-width="1.5"/>
  <text x="210" y="103" text-anchor="middle" fill="#c8a96e" font-size="9" font-family="monospace">Resolution: a fact that makes A + B possible</text>
  <text x="210" y="118" text-anchor="middle" fill="#888" font-size="8" font-family="monospace">More reporters, not more noise</text>
</svg>`
      }
    ]
  },
  {
    id: 'ar', label: 'Analytical Reasoning', color: '#90caf9',
    tagline: 'Logic Games — constrained ordering and grouping puzzles',
    lessons: [
      {
        title: 'Setting Up a Game',
        body: 'Every logic game has a scenario (what is being arranged), a set of variables (the items being placed), slots (positions or groups), and rules (constraints). Before answering any question, build a clean diagram: write the slots across the top, the variables below, and notate each rule symbolically. Linear ordering games — the most common type — arrange variables in a strict sequence of numbered positions.',
        practical: 'Court scheduling mirrors a linear game. A judge must schedule seven motions across a single day. Rules like "the suppression motion must be heard before the discovery dispute" and "the Daubert hearing cannot be the last" map exactly to LSAT constraints. Violating one scheduling rule cascades through the entire docket.',
        example: 'Scenario: Six witnesses — A, B, C, D, E, F — testify one at a time.\nRules: A before B. D not adjacent to E. C last.\nDiagram: [1][2][3][4][5][C]. Immediately: C is fixed. Then apply A-before-B and D/E separation.',
        formulas: ['Draw every slot before placing anything', 'Symbolise rules: A < B (A before B), A-B (adjacent), ¬(D-E) (not adjacent)', 'Make deductions before answering'],
        svg: `<svg viewBox="0 0 420 140" xmlns="http://www.w3.org/2000/svg">
  <rect width="420" height="140" fill="#0d0d12" rx="8"/>
  <text x="210" y="22" text-anchor="middle" fill="#90caf9" font-size="10" font-family="monospace">Linear Game Diagram: 6 Witnesses</text>
  <rect x="20" y="35" width="56" height="44" rx="4" fill="#0d1220" stroke="#90caf9" stroke-width="1.5"/>
  <text x="48" y="54" text-anchor="middle" fill="#90caf9" font-size="10" font-family="monospace">1</text>
  <text x="48" y="68" text-anchor="middle" fill="#666" font-size="8" font-family="monospace">?</text>
  <rect x="84" y="35" width="56" height="44" rx="4" fill="#0d1220" stroke="#90caf9" stroke-width="1.5"/>
  <text x="112" y="54" text-anchor="middle" fill="#90caf9" font-size="10" font-family="monospace">2</text>
  <text x="112" y="68" text-anchor="middle" fill="#666" font-size="8" font-family="monospace">?</text>
  <rect x="148" y="35" width="56" height="44" rx="4" fill="#0d1220" stroke="#90caf9" stroke-width="1.5"/>
  <text x="176" y="54" text-anchor="middle" fill="#90caf9" font-size="10" font-family="monospace">3</text>
  <text x="176" y="68" text-anchor="middle" fill="#666" font-size="8" font-family="monospace">?</text>
  <rect x="212" y="35" width="56" height="44" rx="4" fill="#0d1220" stroke="#90caf9" stroke-width="1.5"/>
  <text x="240" y="54" text-anchor="middle" fill="#90caf9" font-size="10" font-family="monospace">4</text>
  <text x="240" y="68" text-anchor="middle" fill="#666" font-size="8" font-family="monospace">?</text>
  <rect x="276" y="35" width="56" height="44" rx="4" fill="#0d1220" stroke="#90caf9" stroke-width="1.5"/>
  <text x="304" y="54" text-anchor="middle" fill="#90caf9" font-size="10" font-family="monospace">5</text>
  <text x="304" y="68" text-anchor="middle" fill="#666" font-size="8" font-family="monospace">?</text>
  <rect x="340" y="35" width="56" height="44" rx="4" fill="#0d1220" stroke="#c8a96e" stroke-width="2"/>
  <text x="368" y="54" text-anchor="middle" fill="#90caf9" font-size="10" font-family="monospace">6</text>
  <text x="368" y="68" text-anchor="middle" fill="#c8a96e" font-size="10" font-family="monospace">C</text>
  <text x="210" y="105" text-anchor="middle" fill="#888" font-size="9" font-family="monospace">Rule: C is last → fix it immediately</text>
  <text x="210" y="120" text-anchor="middle" fill="#666" font-size="9" font-family="monospace">A &lt; B  ·  D not adjacent to E</text>
</svg>`
      },
      {
        title: 'Grouping &amp; In/Out Games',
        body: 'Grouping games assign variables to two or more named groups (committees, teams, departments). In/Out games are a special case: every variable either is selected (In) or not (Out). Rules typically take conditional form: "If X is selected, Y must also be selected" (X → Y), which contrapositive gives ¬Y → ¬X. Chain the conditionals to find forced selections.',
        practical: 'Corporate restructuring decisions are grouping games. A general counsel deciding which executives to retain (In) versus redeploy (Out) faces conditional constraints: "If the CFO stays, the VP Finance must also stay." Charting the conditionals prevents conflicting decisions that create legal exposure.',
        example: 'Scenario: Select 3 of 5 attorneys (A B C D E) for a trial team.\nRules: If A, then B (A→B). If C, then not D (C→¬D).\nIf A is In: B is forced In. That leaves 1 more slot from {C, D, E}. If C is chosen, D is Out — valid. If D, valid. If E, valid. But C and D cannot both be In.',
        formulas: ['If A → B; contrapositive: ¬B → ¬A', 'If A → ¬B means A and B cannot both be In', 'Chain: A→B, B→C therefore A→C'],
        svg: `<svg viewBox="0 0 420 140" xmlns="http://www.w3.org/2000/svg">
  <rect width="420" height="140" fill="#0d0d12" rx="8"/>
  <rect x="20" y="20" width="175" height="100" rx="6" fill="#0d1220" stroke="#90caf9" stroke-width="1.5"/>
  <text x="107" y="38" text-anchor="middle" fill="#90caf9" font-size="10" font-family="monospace">IN (selected)</text>
  <text x="65" y="65" text-anchor="middle" fill="#ccc" font-size="13" font-family="monospace">A</text>
  <text x="107" y="65" text-anchor="middle" fill="#ccc" font-size="13" font-family="monospace">B</text>
  <text x="149" y="65" text-anchor="middle" fill="#ccc" font-size="13" font-family="monospace">_</text>
  <text x="107" y="105" text-anchor="middle" fill="#666" font-size="8" font-family="monospace">A→B forces B here</text>
  <rect x="225" y="20" width="175" height="100" rx="6" fill="#1a0d0d" stroke="#ef5350" stroke-width="1.5"/>
  <text x="312" y="38" text-anchor="middle" fill="#ef5350" font-size="10" font-family="monospace">OUT (rejected)</text>
  <text x="270" y="65" text-anchor="middle" fill="#ccc" font-size="13" font-family="monospace">D</text>
  <text x="312" y="65" text-anchor="middle" fill="#ccc" font-size="13" font-family="monospace">_</text>
  <text x="312" y="105" text-anchor="middle" fill="#666" font-size="8" font-family="monospace">C→¬D: if C in, D out</text>
</svg>`
      },
      {
        title: 'Conditional Logic &amp; Contrapositives',
        body: 'Every conditional statement "If P then Q" (P→Q) has an equivalent contrapositive "If not Q then not P" (¬Q→¬P). The inverse (¬P→¬Q) and converse (Q→P) are NOT equivalent. On the LSAT, bi-conditional rules use "if and only if" (P↔Q), meaning P→Q and Q→P both hold. Mastering the contrapositive eliminates half the logical errors test-takers make.',
        practical: 'Statutory conditions are conditionals. The Clean Air Act states: "If a facility emits above the threshold [P], it must obtain a permit [Q]." The contrapositive enforces the opposite: "If a facility has no permit [¬Q], it must not emit above the threshold [¬P]." A compliance officer applies the contrapositive daily.',
        example: '"If a witness is granted immunity [I], she must testify [T]." (I→T)\nContrapositive: If she does not testify (¬T), she was not granted immunity (¬I).\nInverse (wrong): If she is not granted immunity, she need not testify — NOT valid.\nConverse (wrong): If she testifies, she was granted immunity — NOT valid.',
        formulas: ['If P → Q  valid; Contrapositive ¬Q → ¬P  valid', 'Inverse ¬P → ¬Q  NOT valid', 'Converse Q → P  NOT valid', 'If P ↔ Q: both P→Q and Q→P hold'],
        svg: `<svg viewBox="0 0 420 140" xmlns="http://www.w3.org/2000/svg">
  <rect width="420" height="140" fill="#0d0d12" rx="8"/>
  <rect x="15" y="15" width="185" height="50" rx="5" fill="#0d1220" stroke="#90caf9" stroke-width="1.5"/>
  <text x="107" y="32" text-anchor="middle" fill="#90caf9" font-size="9" font-family="monospace">VALID: Original</text>
  <text x="107" y="52" text-anchor="middle" fill="#ccc" font-size="11" font-family="monospace">P → Q</text>
  <rect x="220" y="15" width="185" height="50" rx="5" fill="#0d1220" stroke="#90caf9" stroke-width="1.5"/>
  <text x="312" y="32" text-anchor="middle" fill="#90caf9" font-size="9" font-family="monospace">VALID: Contrapositive</text>
  <text x="312" y="52" text-anchor="middle" fill="#ccc" font-size="11" font-family="monospace">¬Q → ¬P</text>
  <rect x="15" y="80" width="185" height="48" rx="5" fill="#1a0808" stroke="#ef5350" stroke-width="1.2"/>
  <text x="107" y="97" text-anchor="middle" fill="#ef5350" font-size="9" font-family="monospace">INVALID: Inverse</text>
  <text x="107" y="117" text-anchor="middle" fill="#888" font-size="11" font-family="monospace">¬P → ¬Q  ✗</text>
  <rect x="220" y="80" width="185" height="48" rx="5" fill="#1a0808" stroke="#ef5350" stroke-width="1.2"/>
  <text x="312" y="97" text-anchor="middle" fill="#ef5350" font-size="9" font-family="monospace">INVALID: Converse</text>
  <text x="312" y="117" text-anchor="middle" fill="#888" font-size="11" font-family="monospace">Q → P  ✗</text>
</svg>`
      },
      {
        title: 'Advanced Deductions &amp; Hybrid Games',
        body: 'Hybrid games combine elements of linear ordering and grouping. The key skill is making deductions before touching questions: find the most constrained variable and chain its rules. Look for "blocks" (variables that must be adjacent or together), "floaters" (variables with no rules — maximally flexible), and "anti-blocks" (variables that cannot be together).',
        practical: 'Multi-party litigation scheduling combines a timeline (linear) with team assignments (grouping). Deduction chains: "If the class certification hearing is Week 1, lead counsel must attend; lead counsel cannot attend any deposition that week; therefore all depositions must be after Week 1."',
        example: 'Hybrid: Assign 5 attorneys to AM or PM sessions on Monday and Tuesday (grouping + ordering).\nDeduction chain: Rule says A and B cannot share a session. Rule says C must be in the same session as D. If C=Monday AM, then D=Monday AM, and A and B must be split across remaining slots.',
        formulas: ['Block: A-B (must be consecutive/together)', 'Anti-block: A ≠ B (cannot be together)', 'Floater: no rules → most flexible, place last'],
        svg: `<svg viewBox="0 0 420 140" xmlns="http://www.w3.org/2000/svg">
  <rect width="420" height="140" fill="#0d0d12" rx="8"/>
  <text x="210" y="20" text-anchor="middle" fill="#90caf9" font-size="10" font-family="monospace">Hybrid: Session Assignment</text>
  <rect x="20" y="30" width="180" height="44" rx="5" fill="#0d1220" stroke="#90caf9" stroke-width="1.2"/>
  <text x="110" y="46" text-anchor="middle" fill="#90caf9" font-size="9" font-family="monospace">Monday AM</text>
  <text x="75" y="64" text-anchor="middle" fill="#c8a96e" font-size="11" font-family="monospace">C</text>
  <text x="110" y="64" text-anchor="middle" fill="#c8a96e" font-size="11" font-family="monospace">D</text>
  <text x="145" y="64" text-anchor="middle" fill="#666" font-size="11" font-family="monospace">?</text>
  <rect x="220" y="30" width="180" height="44" rx="5" fill="#0d1220" stroke="#90caf9" stroke-width="1.2"/>
  <text x="310" y="46" text-anchor="middle" fill="#90caf9" font-size="9" font-family="monospace">Monday PM</text>
  <text x="275" y="64" text-anchor="middle" fill="#666" font-size="11" font-family="monospace">?</text>
  <text x="310" y="64" text-anchor="middle" fill="#666" font-size="11" font-family="monospace">?</text>
  <text x="210" y="102" text-anchor="middle" fill="#888" font-size="9" font-family="monospace">C=D block → placed together. A≠B anti-block → split.</text>
  <text x="210" y="118" text-anchor="middle" fill="#666" font-size="9" font-family="monospace">One of A,B in Mon AM; other in Mon PM or Tue.</text>
</svg>`
      }
    ]
  },
  {
    id: 'rc', label: 'Reading Comprehension', color: '#a5d6a7',
    tagline: 'Dense passages from law, science, and humanities',
    lessons: [
      {
        title: 'Passage Structure &amp; Main Point',
        body: 'Reading Comprehension passages follow a consistent architecture: an opening that introduces the topic or a position, a development that presents evidence, counterarguments, or history, and a resolution or conclusion. The main point is what the author is primarily trying to establish — not just a topic, but the author\'s specific claim about that topic. Map the passage: mark the main point, each paragraph\'s role, and the author\'s tone.',
        practical: 'Legal briefs follow identical structure: statement of the issue, statement of facts, argument (with sub-arguments), and conclusion. A law clerk reading a brief maps the same elements an LSAT student maps: what is the main claim, what evidence supports it, and what does the author concede?',
        example: 'Passage structure map:\nP1: Background — common law rule on privity of contract\nP2: Criticism — why the rule produces unjust outcomes\nP3: Modern reform — how courts have departed from strict privity\nP4: Author\'s view — reform is correct but has gone too far\nMain point: The relaxation of privity doctrine is a positive development, but courts should establish clearer limits.',
        formulas: ['Main point: author\'s primary claim, not just the topic', 'Paragraph map: note each paragraph\'s function', 'Tone: neutral / critical / supportive / cautious'],
        svg: `<svg viewBox="0 0 420 140" xmlns="http://www.w3.org/2000/svg">
  <rect width="420" height="140" fill="#0d0d12" rx="8"/>
  <rect x="15" y="15" width="390" height="24" rx="4" fill="#0a1a0a" stroke="#a5d6a7" stroke-width="1.2"/>
  <text x="210" y="31" text-anchor="middle" fill="#a5d6a7" font-size="9" font-family="monospace">P1: Background / Topic introduction</text>
  <rect x="15" y="45" width="390" height="24" rx="4" fill="#0d120d" stroke="#a5d6a7" stroke-width="1"/>
  <text x="210" y="61" text-anchor="middle" fill="#ccc" font-size="9" font-family="monospace">P2: Problem / Complication / Counterargument</text>
  <rect x="15" y="75" width="390" height="24" rx="4" fill="#0d120d" stroke="#a5d6a7" stroke-width="1"/>
  <text x="210" y="91" text-anchor="middle" fill="#ccc" font-size="9" font-family="monospace">P3: Development / Evidence / Alternative view</text>
  <rect x="15" y="105" width="390" height="24" rx="4" fill="#0a1a0a" stroke="#c8a96e" stroke-width="1.5"/>
  <text x="210" y="121" text-anchor="middle" fill="#c8a96e" font-size="9" font-family="monospace">P4: Author's conclusion / Main point lives here</text>
</svg>`
      },
      {
        title: 'Inference &amp; Author\'s Attitude',
        body: 'RC inference questions ask what the passage implies — a conclusion the author would accept based on what is stated, but which is not stated explicitly. Author\'s attitude questions ask how the author feels about a position, person, or theory: enthusiastic support, qualified agreement, neutral presentation, measured criticism, or strong opposition. Tone words in the passage signal attitude.',
        practical: 'Judicial opinions are studied for author\'s attitude to assess precedent. A Supreme Court opinion that characterises a prior ruling as "an anomaly that has been steadily eroded" signals a hostile attitude toward that precedent — even if the court stops short of overruling it. Reading tone is as important as reading holdings.',
        example: 'Passage says: "Some scholars have argued that originalism provides objective answers; this claim, while appealing in its simplicity, overlooks the profound interpretive difficulties that arise when historical evidence conflicts."\nAttitude toward originalism: Critical / sceptical — acknowledges its appeal but finds it insufficient.',
        formulas: ['Tone spectrum: enthusiastic → supportive → neutral → sceptical → critical', 'Watch hedging language: "may," "could," "some argue" = author not committed', 'Watch assertive language: "clearly," "it is evident" = author\'s own view'],
        svg: `<svg viewBox="0 0 420 130" xmlns="http://www.w3.org/2000/svg">
  <rect width="420" height="130" fill="#0d0d12" rx="8"/>
  <text x="210" y="20" text-anchor="middle" fill="#a5d6a7" font-size="10" font-family="monospace">Author Attitude Spectrum</text>
  <line x1="30" y1="55" x2="390" y2="55" stroke="#333" stroke-width="2"/>
  <circle cx="30" cy="55" r="5" fill="#4caf50"/>
  <text x="30" y="74" text-anchor="middle" fill="#4caf50" font-size="8" font-family="monospace">Strong</text>
  <text x="30" y="84" text-anchor="middle" fill="#4caf50" font-size="8" font-family="monospace">support</text>
  <circle cx="120" cy="55" r="5" fill="#a5d6a7"/>
  <text x="120" y="74" text-anchor="middle" fill="#a5d6a7" font-size="8" font-family="monospace">Qualified</text>
  <text x="120" y="84" text-anchor="middle" fill="#a5d6a7" font-size="8" font-family="monospace">agreement</text>
  <circle cx="210" cy="55" r="5" fill="#888"/>
  <text x="210" y="74" text-anchor="middle" fill="#888" font-size="8" font-family="monospace">Neutral /</text>
  <text x="210" y="84" text-anchor="middle" fill="#888" font-size="8" font-family="monospace">descriptive</text>
  <circle cx="300" cy="55" r="5" fill="#ef9a9a"/>
  <text x="300" y="74" text-anchor="middle" fill="#ef9a9a" font-size="8" font-family="monospace">Measured</text>
  <text x="300" y="84" text-anchor="middle" fill="#ef9a9a" font-size="8" font-family="monospace">criticism</text>
  <circle cx="390" cy="55" r="5" fill="#ef5350"/>
  <text x="390" y="74" text-anchor="middle" fill="#ef5350" font-size="8" font-family="monospace">Strong</text>
  <text x="390" y="84" text-anchor="middle" fill="#ef5350" font-size="8" font-family="monospace">opposition</text>
  <text x="210" y="115" text-anchor="middle" fill="#555" font-size="8" font-family="monospace">Locate tone words → eliminate extreme/neutral answers</text>
</svg>`
      },
      {
        title: 'Comparative Passages',
        body: 'Section 4 of the RC section contains one set of two shorter paired passages on the same topic, written from different perspectives. Questions ask about each passage individually, both together, or how the authors would react to each other\'s arguments. Map both passages for main point and attitude, then identify where they agree and where they disagree.',
        practical: 'Comparative passage analysis mirrors reading opposing briefs. A partner preparing for oral argument must know both sides: where the parties agree (uncontested facts), where they disagree (the legal issue), and how each party\'s argument responds to the other\'s best point. This is exactly the analytical task in comparative RC.',
        example: 'Passage A: argues strict liability for AI-generated harm promotes accountability.\nPassage B: argues negligence standard is more appropriate because AI systems lack agency.\nAgreement: Both acknowledge that existing tort frameworks need updating.\nDisagreement: Passage A favours strict liability; Passage B favours negligence.',
        formulas: ['Map each: main point, tone, key evidence', 'Agreement zones: both authors would accept', 'Disagreement zones: the contested issue between them'],
        svg: `<svg viewBox="0 0 420 130" xmlns="http://www.w3.org/2000/svg">
  <rect width="420" height="130" fill="#0d0d12" rx="8"/>
  <ellipse cx="145" cy="65" rx="115" ry="48" fill="#0a1a0a" stroke="#a5d6a7" stroke-width="1.5"/>
  <text x="90" y="55" text-anchor="middle" fill="#a5d6a7" font-size="9" font-family="monospace">Passage A</text>
  <text x="90" y="70" text-anchor="middle" fill="#888" font-size="8" font-family="monospace">Strict liability</text>
  <ellipse cx="275" cy="65" rx="115" ry="48" fill="#0d120d" stroke="#a5d6a7" stroke-width="1.5"/>
  <text x="330" y="55" text-anchor="middle" fill="#a5d6a7" font-size="9" font-family="monospace">Passage B</text>
  <text x="330" y="70" text-anchor="middle" fill="#888" font-size="8" font-family="monospace">Negligence std</text>
  <ellipse cx="210" cy="65" rx="46" ry="30" fill="#1a1500" stroke="#c8a96e" stroke-width="1.5"/>
  <text x="210" y="61" text-anchor="middle" fill="#c8a96e" font-size="8" font-family="monospace">Agree:</text>
  <text x="210" y="73" text-anchor="middle" fill="#888" font-size="8" font-family="monospace">need reform</text>
</svg>`
      }
    ]
  },
  {
    id: 'strategy', label: 'LSAT Strategy', color: '#ffcc80',
    tagline: 'Process, timing, and mental frameworks',
    lessons: [
      {
        title: 'Process of Elimination',
        body: 'The correct LSAT answer must be provably true given the stimulus. Wrong answers fall into predictable traps: out of scope (introduces information not in the stimulus), too extreme (uses "always," "never," "all," "none" without justification), opposite of what is needed, irrelevant to the assumption, or half-right / half-wrong. Train yourself to eliminate wrong answers rather than hunt for a "good" one.',
        practical: 'Jury selection applies elimination systematically. An attorney does not look for the perfect juror but uses peremptory challenges and cause challenges to eliminate demonstrably biased candidates. The remaining pool, after elimination, is the best attainable — the same logic as POE.',
        example: 'Correct answer on a strengthen question: "Studies in comparable cities with identical income levels showed the same trend."\nWhy it works: directly eliminates the confounding variable.\nWrong traps: "Plastic bags are harmful to marine life" (out of scope — does not address litter causation). "All environmental regulations reduce pollution" (too extreme).',
        formulas: ['Out of scope: new information not tied to the argument', 'Too extreme: absolute quantifiers without support', 'Half right / half wrong: first clause correct, second wrong'],
        svg: `<svg viewBox="0 0 420 130" xmlns="http://www.w3.org/2000/svg">
  <rect width="420" height="130" fill="#0d0d12" rx="8"/>
  <text x="210" y="20" text-anchor="middle" fill="#ffcc80" font-size="10" font-family="monospace">Process of Elimination (POE)</text>
  <rect x="15" y="30" width="185" height="28" rx="4" fill="#111" stroke="#ef5350" stroke-width="1"/>
  <text x="107" y="48" text-anchor="middle" fill="#888" font-size="9" font-family="monospace">Out of scope ✗</text>
  <rect x="220" y="30" width="185" height="28" rx="4" fill="#111" stroke="#ef5350" stroke-width="1"/>
  <text x="312" y="48" text-anchor="middle" fill="#888" font-size="9" font-family="monospace">Too extreme ✗</text>
  <rect x="15" y="66" width="185" height="28" rx="4" fill="#111" stroke="#ef5350" stroke-width="1"/>
  <text x="107" y="84" text-anchor="middle" fill="#888" font-size="9" font-family="monospace">Opposite direction ✗</text>
  <rect x="220" y="66" width="185" height="28" rx="4" fill="#111" stroke="#ef5350" stroke-width="1"/>
  <text x="312" y="84" text-anchor="middle" fill="#888" font-size="9" font-family="monospace">Half right / half wrong ✗</text>
  <rect x="107" y="102" width="206" height="22" rx="4" fill="#0a1a0a" stroke="#ffcc80" stroke-width="1.5"/>
  <text x="210" y="117" text-anchor="middle" fill="#ffcc80" font-size="9" font-family="monospace">Remaining answer = correct ✓</text>
</svg>`
      },
      {
        title: 'Formal Logic &amp; the Negation Test',
        body: 'The Negation Test is used exclusively on necessary assumption questions. To test a candidate answer: negate it (flip "some" to "none," "all" to "not all," "is" to "is not"), then ask whether the negated version destroys the conclusion. If the argument collapses, the original statement is a necessary assumption. The test works because assumptions are definitionally required — without them the argument fails.',
        practical: 'The criminal standard "beyond reasonable doubt" is a formal quantifier. Negating the assumption that the jury applied the correct standard: "The jury did not apply the reasonable doubt standard" — if true, the verdict is legally void. Defence appellate strategy is built on identifying which assumption, if negated, collapses the conviction.',
        example: 'Argument: "The defendant must have been in City A on Tuesday [conclusion] because she was seen boarding a train to City A on Monday [premise]."\nCandidate assumption: "The train to City A is a direct service with no stops."\nNegate: "The train makes stops and passengers can disembark before City A."\nEffect: The conclusion (she ended up in City A) no longer follows. Therefore this IS a necessary assumption.',
        formulas: ['Negate: "all" → "not all"; "some" → "none"; "is" → "is not"', 'If negated assumption destroys conclusion → necessary assumption', 'If negated assumption has no effect → not a necessary assumption'],
        svg: `<svg viewBox="0 0 420 130" xmlns="http://www.w3.org/2000/svg">
  <rect width="420" height="130" fill="#0d0d12" rx="8"/>
  <rect x="20" y="15" width="380" height="32" rx="5" fill="#111" stroke="#ffcc80" stroke-width="1.2"/>
  <text x="210" y="26" text-anchor="middle" fill="#ffcc80" font-size="9" font-family="monospace">Step 1: Negate the candidate answer</text>
  <text x="210" y="40" text-anchor="middle" fill="#888" font-size="8" font-family="monospace">"All X" → "Not all X" / "Some X" → "No X" / "A is B" → "A is not B"</text>
  <rect x="20" y="57" width="175" height="44" rx="5" fill="#0a1a0a" stroke="#4caf50" stroke-width="1.5"/>
  <text x="107" y="73" text-anchor="middle" fill="#4caf50" font-size="9" font-family="monospace">Conclusion collapses?</text>
  <text x="107" y="89" text-anchor="middle" fill="#888" font-size="8" font-family="monospace">→ Necessary assumption ✓</text>
  <rect x="225" y="57" width="175" height="44" rx="5" fill="#1a0808" stroke="#ef5350" stroke-width="1.2"/>
  <text x="312" y="73" text-anchor="middle" fill="#ef5350" font-size="9" font-family="monospace">Conclusion still holds?</text>
  <text x="312" y="89" text-anchor="middle" fill="#888" font-size="8" font-family="monospace">→ Not the right answer ✗</text>
  <text x="210" y="118" text-anchor="middle" fill="#555" font-size="8" font-family="monospace">Apply this test when you are between two answer choices</text>
</svg>`
      }
    ]
  }
];

// ─── PRACTICE BANK ────────────────────────────────────────────────────────────
const QUESTIONS = [
  {
    type: 'lr', qtype: 'Assumption',
    stimulus: 'Ridgeline County\'s new ordinance requires all food trucks to obtain a health inspection certificate before operating. After the ordinance took effect, the number of food trucks operating in the county fell by 40%.',
    stem: 'Which of the following is an assumption required by someone who concludes from the above that the ordinance caused the decline in food trucks?',
    choices: [
      'The health inspection certificates are expensive to obtain.',
      'The food trucks that stopped operating did so because they could not or did not obtain the required certificates.',
      'Health inspections improve the quality of food sold at food trucks.',
      'Many food truck operators were unaware of the new ordinance.',
      'The county\'s food truck industry was growing before the ordinance took effect.'
    ],
    correct: 1,
    explanation: 'The argument concludes that the ordinance caused the decline. This requires assuming the trucks stopped because of the certificate requirement — otherwise the correlation is coincidental. (B) is the necessary link. Negated: "The trucks that stopped did NOT do so because of the certificates" — the causal conclusion collapses. (A) might explain why, but the conclusion does not require cost as the mechanism — only that the ordinance was causally responsible.'
  },
  {
    type: 'lr', qtype: 'Weaken',
    stimulus: 'A recent study found that children who ate breakfast daily scored 15% higher on standardised tests than children who skipped breakfast. The study\'s authors concluded that eating breakfast improves academic performance.',
    stem: 'Which of the following, if true, most seriously weakens the argument?',
    choices: [
      'Some children in the study who ate breakfast still scored poorly on the tests.',
      'Children from higher-income households are both more likely to eat breakfast regularly and to have access to additional educational resources.',
      'The standardised tests used in the study have been criticised by some educators as unreliable.',
      'Eating a nutritious breakfast has well-established health benefits beyond academic performance.',
      'The study was conducted over a single school year.'
    ],
    correct: 1,
    explanation: '(B) introduces a confounding variable: household income correlates with both breakfast habits AND educational resources. This means the test score gap may be caused by income-related advantages rather than breakfast itself, undermining the causal conclusion. The argument assumes no confounds — (B) directly attacks that assumption.'
  },
  {
    type: 'lr', qtype: 'Flaw',
    stimulus: 'Every lawyer at the firm who graduated from a top-ten law school has made partner. Meredith graduated from a top-ten law school. Therefore Meredith will make partner.',
    stem: 'The argument\'s reasoning is flawed because it',
    choices: [
      'draws a conclusion about all lawyers from a sample of some lawyers',
      'treats a condition that is sufficient for an outcome as though it were necessary for that outcome',
      'fails to consider that Meredith may not want to make partner',
      'assumes without justification that top-ten law school rankings are accurate',
      'ignores evidence that contradicts the premise about top-ten graduates'
    ],
    correct: 1,
    explanation: 'The premise establishes: Top-ten graduate → made partner (sufficient condition for partnership). The argument then treats this as: Meredith is a top-ten grad → Meredith will make partner. But "sufficient" means it guarantees the result when paired with other unnamed conditions — it does not mean every top-ten grad is guaranteed to make partner in the future. This is treating a sufficient condition as necessary. (B) precisely names this flaw.'
  },
  {
    type: 'ar', qtype: 'Logic Game',
    stimulus: 'Seven employees — F, G, H, J, K, L, M — are scheduled one at a time for performance reviews on a single day, in seven consecutive slots. The following constraints apply: F is reviewed before G. H is reviewed third. K is not reviewed immediately before or after L.',
    stem: 'If J is reviewed second, which of the following must be true?',
    choices: [
      'F is reviewed first.',
      'G is reviewed fourth or later.',
      'K is reviewed sixth or seventh.',
      'L is reviewed immediately before M.',
      'M is reviewed before K.'
    ],
    correct: 1,
    explanation: 'Slot 2 = J, Slot 3 = H (fixed). F must come before G. With slots 1, 4, 5, 6, 7 remaining for F, G, K, L, M — F must precede G. If F is in slot 1, G could be 4, 5, 6, or 7. If F is in slot 4, G must be 5, 6, or 7 — always slot 4 or later for G. There is no arrangement where G is earlier than slot 4 given F must precede G and slots 2 and 3 are taken. (B) must be true.'
  },
  {
    type: 'rc', qtype: 'Main Point',
    stimulus: 'The following is a summary of a Reading Comprehension passage: The passage describes how the traditional rule requiring privity of contract limited tort recovery to parties directly in a contract. It then traces how courts in the twentieth century relaxed this requirement, most notably in MacPherson v. Buick, extending liability to foreseeable users. The author argues that while this extension was necessary to address injustice, subsequent courts have expanded liability too broadly, creating unpredictable outcomes for manufacturers.',
    stem: 'Which of the following best expresses the main point of the passage?',
    choices: [
      'The privity requirement in tort law has been abolished entirely by modern courts.',
      'The relaxation of the privity rule was a positive development, but courts have since extended liability beyond defensible limits.',
      'MacPherson v. Buick was incorrectly decided and should be overturned.',
      'Manufacturers face unfair liability under modern tort law.',
      'Privity of contract remains the dominant rule in most jurisdictions.'
    ],
    correct: 1,
    explanation: '(B) captures both moves the author makes: (1) endorsing the initial relaxation of the privity rule and (2) criticising the subsequent overexpansion. The main point must reflect the author\'s ultimate position, which is nuanced — not simple abolition or restoration of privity, but a call for limits on how far the relaxation extends.'
  },
  {
    type: 'lr', qtype: 'Inference',
    stimulus: 'No law firm that exclusively handles criminal defence work also handles corporate mergers. Castellan & Associates handles corporate mergers. Every law firm in Midtown handles corporate mergers.',
    stem: 'If the statements above are true, which of the following must be true?',
    choices: [
      'Castellan & Associates is located in Midtown.',
      'No law firm in Midtown exclusively handles criminal defence work.',
      'Castellan & Associates does not handle criminal defence work.',
      'Some Midtown law firms also handle criminal defence cases.',
      'Castellan & Associates is the largest firm in Midtown.'
    ],
    correct: 1,
    explanation: 'Every Midtown firm handles corporate mergers (given). No firm that exclusively handles criminal defence also handles corporate mergers (given). Therefore no Midtown firm exclusively handles criminal defence. (B) follows necessarily. (A) is not stated. (C) goes too far — Castellan handles mergers, so it does not exclusively handle criminal defence, but it may handle some criminal work alongside mergers.'
  }
];

// ─── GLOSSARY ─────────────────────────────────────────────────────────────────
const GLOSSARY = [
  { term: 'Conclusion', cat: 'Logical Reasoning', def: 'The main claim the argument is trying to establish. Signalled by: therefore, thus, hence, so, consequently.' },
  { term: 'Premise', cat: 'Logical Reasoning', def: 'Evidence or facts offered in support of the conclusion. Signalled by: because, since, given that, for, as evidenced by.' },
  { term: 'Assumption', cat: 'Logical Reasoning', def: 'An unstated premise the argument requires to be true. The gap between premises and conclusion.' },
  { term: 'Negation Test', cat: 'Logical Reasoning', def: 'To identify a necessary assumption: negate the candidate answer. If the negated version destroys the conclusion, the original is a necessary assumption.' },
  { term: 'Necessary Assumption', cat: 'Logical Reasoning', def: 'Something that must be true for the conclusion to hold. The argument cannot work without it.' },
  { term: 'Sufficient Assumption', cat: 'Logical Reasoning', def: 'Something that, if true, guarantees the conclusion. It alone bridges the gap. Stronger than a necessary assumption.' },
  { term: 'Strengthen', cat: 'Logical Reasoning', def: 'An answer that makes the conclusion more likely to follow from the premises, typically by supporting the assumption.' },
  { term: 'Weaken', cat: 'Logical Reasoning', def: 'An answer that makes the conclusion less likely to follow from the premises, typically by attacking the assumption or introducing a confound.' },
  { term: 'Flaw', cat: 'Logical Reasoning', def: 'A logical error in the argument\'s reasoning. Common types: ad hominem, hasty generalisation, false dilemma, circular reasoning, correlation/causation confusion.' },
  { term: 'Inference', cat: 'Logical Reasoning', def: 'A conclusion that must follow from the stated facts. On the LSAT, the correct inference is the weakest defensible claim entailed by the stimulus.' },
  { term: 'Paradox', cat: 'Logical Reasoning', def: 'Two facts that appear contradictory. A paradox question asks for a statement that explains how both can simultaneously be true.' },
  { term: 'Parallel Reasoning', cat: 'Logical Reasoning', def: 'An answer that replicates the exact logical structure of the stimulus argument, including any flaw if the original is flawed.' },
  { term: 'Ad Hominem', cat: 'Logical Reasoning', def: 'A flaw: attacking the person making the argument rather than the argument itself.' },
  { term: 'Hasty Generalisation', cat: 'Logical Reasoning', def: 'A flaw: drawing a broad conclusion from an unrepresentative or too-small sample.' },
  { term: 'False Dilemma', cat: 'Logical Reasoning', def: 'A flaw: presenting only two options when more exist.' },
  { term: 'Circular Reasoning', cat: 'Logical Reasoning', def: 'A flaw: the conclusion is used as a premise to support itself.' },
  { term: 'Equivocation', cat: 'Logical Reasoning', def: 'A flaw: a key term shifts meaning between its use in a premise and its use in the conclusion.' },
  { term: 'Confounding Variable', cat: 'Logical Reasoning', def: 'A third factor that explains a correlation without any causal link between the two observed variables.' },
  { term: 'Linear Game', cat: 'Analytical Reasoning', def: 'A logic game in which variables are arranged in a strict sequence of numbered positions.' },
  { term: 'Grouping Game', cat: 'Analytical Reasoning', def: 'A logic game in which variables are assigned to two or more named groups.' },
  { term: 'In/Out Game', cat: 'Analytical Reasoning', def: 'A grouping game where each variable is either selected (In) or not selected (Out).' },
  { term: 'Hybrid Game', cat: 'Analytical Reasoning', def: 'A logic game combining elements of linear ordering and grouping.' },
  { term: 'Block', cat: 'Analytical Reasoning', def: 'A constraint requiring two variables to be adjacent or placed together.' },
  { term: 'Anti-block', cat: 'Analytical Reasoning', def: 'A constraint preventing two variables from being adjacent or placed together.' },
  { term: 'Floater', cat: 'Analytical Reasoning', def: 'A variable with no rules attached, making it the most flexible element to place last.' },
  { term: 'Conditional Rule', cat: 'Analytical Reasoning', def: 'A constraint of the form "If P, then Q" (P→Q). Its contrapositive ¬Q→¬P is always valid.' },
  { term: 'Contrapositive', cat: 'Analytical Reasoning', def: 'The logically equivalent form of "If P→Q": "If ¬Q→¬P." Always valid. The inverse (¬P→¬Q) and converse (Q→P) are not equivalent.' },
  { term: 'Bi-conditional', cat: 'Analytical Reasoning', def: '"If and only if P, then Q" (P↔Q): both P→Q and Q→P hold simultaneously.' },
  { term: 'Deduction', cat: 'Analytical Reasoning', def: 'A firm conclusion derived by combining two or more rules. Make all deductions before answering questions.' },
  { term: 'Main Point', cat: 'Reading Comprehension', def: 'The author\'s primary claim — not just the topic, but the specific assertion the passage is designed to establish.' },
  { term: 'Passage Map', cat: 'Reading Comprehension', def: 'A brief note of each paragraph\'s function and the author\'s tone, made while reading to speed up question answering.' },
  { term: "Author's Attitude", cat: 'Reading Comprehension', def: 'How the author feels toward a subject: enthusiastic, supportive, neutral, sceptical, or critical. Identified through tone words.' },
  { term: 'Comparative Passage', cat: 'Reading Comprehension', def: 'A pair of shorter passages on the same topic, written from different perspectives. One RC section set always uses this format.' },
  { term: 'Inference (RC)', cat: 'Reading Comprehension', def: 'A conclusion the author would accept based on what is stated in the passage, not stated explicitly.' },
  { term: 'Scope', cat: 'Reading Comprehension', def: 'The boundaries of what the passage covers. An out-of-scope answer introduces ideas not present in the passage.' },
  { term: 'Tone', cat: 'Reading Comprehension', def: 'The attitude conveyed by the author\'s word choice. Ranges from enthusiastic to hostile.' },
  { term: 'Process of Elimination', cat: 'Strategy', def: 'Removing demonstrably wrong answer choices until only one remains, rather than hunting for a "good" answer.' },
  { term: 'Out of Scope', cat: 'Strategy', def: 'An answer that introduces information not present in or not relevant to the stimulus.' },
  { term: 'Too Extreme', cat: 'Strategy', def: 'An answer using absolute quantifiers (all, never, always, none) without support in the stimulus.' },
  { term: 'Prephrase', cat: 'Strategy', def: 'Formulating your own answer before reading the choices, to avoid being seduced by attractive wrong answers.' },
  { term: 'Section Timing', cat: 'Strategy', def: 'Each scored section is 35 minutes. Logical Reasoning: ~1:25 per question. Logic Games: ~8:45 per game. Reading Comprehension: ~8:45 per passage.' },
  { term: 'Experimental Section', cat: 'Strategy', def: 'An unscored section (any type) used by LSAC to pilot new questions. Cannot be identified during the test — treat all sections as scored.' },
  { term: 'LSAT Score Scale', cat: 'Strategy', def: 'Scores range from 120 (lowest) to 180 (highest). The median score is approximately 152. A 170+ score is roughly the 97th percentile.' },
  { term: 'Raw Score', cat: 'Strategy', def: 'The number of questions answered correctly. There is no penalty for wrong answers on the LSAT.' }
];

// ─── STRATEGY CARDS ───────────────────────────────────────────────────────────
const STRATEGIES = [
  {
    title: 'Prephrase Before You Read the Choices',
    body: 'Before looking at the answer choices, predict what the correct answer should say. This prevents attractive-but-wrong choices from derailing your thinking.',
    tips: ['Assumption: "What does this argument take for granted?"', 'Weaken: "What fact would make the conclusion less likely?"', 'Inference: "What must follow from these statements?"']
  },
  {
    title: 'Identify the Conclusion First',
    body: 'On every LR question, circle or underline the conclusion before doing anything else. This takes 5 seconds and prevents the most common error: treating a premise as the conclusion.',
    tips: ['Look for: therefore / thus / hence / so / consequently', 'The conclusion is often not the last sentence', 'Intermediate conclusions exist — find the final one']
  },
  {
    title: 'Logic Game Order of Attack',
    body: 'Do not do games in order. Scan all four games first and rank by difficulty. Do easiest games first to bank time. Save the hardest game for last (or skip it entirely if needed).',
    tips: ['Most constrained game = usually easier', 'Hybrid games are often hardest', 'Each question is worth one point regardless of difficulty']
  },
  {
    title: 'RC: Active Reading with Paragraph Maps',
    body: 'Do not read passively. After each paragraph, jot a 3-6 word note summarising its role. This forces comprehension and makes question lookup fast.',
    tips: ['P1: topic + common view', 'P2: complication or problem', 'P3: author\'s solution or analysis', 'P4: conclusion or implication']
  },
  {
    title: 'Time Allocation Per Section',
    body: 'Budget your time deliberately. If you run over on one question, move on and return later. An unanswered question at the end costs exactly the same as a wrong answer.',
    tips: ['LR: 1 min 25 sec per question', 'AR: 8 min 45 sec per game (set up + all Qs)', 'RC: 3-4 min reading + 1 min per question', 'Flag and skip if stuck for more than 2 minutes']
  },
  {
    title: 'Wrong Answer Patterns to Memorise',
    body: 'Each question type has predictable wrong answer traps. Memorising them turns elimination from a slow logical process into pattern recognition.',
    tips: ['Strengthen/Weaken: opposite direction trap', 'Assumption: too broad or introduces new elements', 'Inference: goes beyond what the stimulus states', 'Flaw: names the wrong type of error']
  }
];

// ─── STATE ────────────────────────────────────────────────────────────────────
let pracCorrect = 0, pracTotal = 0;
let currentQ = null;
let answered = false;

// ─── CURRICULUM RENDERING ─────────────────────────────────────────────────────
function renderSubjectGrid() {
  const grid = document.getElementById('subjectGrid');
  grid.innerHTML = '';
  CURRICULUM.forEach((subj, si) => {
    const card = document.createElement('div');
    card.className = 'subject-card';
    card.innerHTML = `
      <div class="subject-num">Section ${si + 1} of ${CURRICULUM.length}</div>
      <h4 style="color:${subj.color}">${subj.label}</h4>
      <p>${subj.tagline}</p>
      <p style="margin-top:6px;color:#444;font-size:0.74rem;">${subj.lessons.length} lesson${subj.lessons.length !== 1 ? 's' : ''}</p>`;
    card.onclick = () => showLessons(si);
    grid.appendChild(card);
  });
}

function showLessons(si) {
  const subj = CURRICULUM[si];
  document.getElementById('subject-grid-view').style.display = 'none';
  document.getElementById('lesson-view').style.display = 'block';
  document.getElementById('lessonTitle').innerHTML =
    `<h3 style="color:${subj.color};margin:0 0 4px">${subj.label}</h3><p style="color:#666;font-size:0.83rem;margin:0">${subj.tagline}</p>`;

  const list = document.getElementById('lessonList');
  list.innerHTML = '';
  subj.lessons.forEach((lesson, li) => {
    const item = document.createElement('div');
    item.className = 'lesson-item';
    const exBox = lesson.example ? `
      <div class="example-box">
        <span class="ex-label">Worked Example</span>
        <p>${lesson.example.replace(/\n/g, '<br>')}</p>
      </div>` : '';
    const chips = lesson.formulas.map(f => `<span class="formula-chip">${f}</span>`).join('');
    item.innerHTML = `
      <div class="lesson-header" onclick="toggleLesson(this)">
        <span class="lesson-num">${li + 1}</span>
        <span class="lesson-title">${lesson.title}</span>
        <span class="lesson-chevron">▶</span>
      </div>
      <div class="lesson-body">
        <p>${lesson.body}</p>
        ${exBox}
        <div class="practical">
          <strong>Real-World Application</strong>
          <p>${lesson.practical}</p>
        </div>
        <div class="lesson-svg">${lesson.svg}</div>
        <div class="formula-chips">${chips}</div>
      </div>`;
    list.appendChild(item);
  });
}

function toggleLesson(hdr) {
  hdr.parentElement.classList.toggle('open');
}

function showSubjectGrid() {
  document.getElementById('lesson-view').style.display = 'none';
  document.getElementById('subject-grid-view').style.display = 'block';
}

// ─── PRACTICE ─────────────────────────────────────────────────────────────────
function loadQuestion() {
  const filter = document.getElementById('prac-filter').value;
  const pool = filter === 'all' ? QUESTIONS : QUESTIONS.filter(q => q.type === filter);
  if (!pool.length) { document.getElementById('questionCard').innerHTML = '<p style="color:#555;font-size:0.85rem;">No questions available for this filter.</p>'; return; }
  currentQ = pool[Math.floor(Math.random() * pool.length)];
  answered = false;
  const letters = ['A', 'B', 'C', 'D', 'E'];
  const choicesHtml = currentQ.choices.map((c, i) =>
    `<div class="q-choice" id="choice-${i}" onclick="selectChoice(${i})">
      <div class="choice-letter">${letters[i]}</div>
      <span class="choice-text">${c}</span>
    </div>`).join('');
  document.getElementById('questionCard').innerHTML = `
    <div class="q-meta">
      <span class="q-tag type">${currentQ.qtype}</span>
      <span class="q-tag">${currentQ.type === 'lr' ? 'Logical Reasoning' : currentQ.type === 'ar' ? 'Analytical Reasoning' : 'Reading Comprehension'}</span>
    </div>
    <div class="q-stimulus">${currentQ.stimulus}</div>
    <p class="q-stem">${currentQ.stem}</p>
    <div class="q-choices">${choicesHtml}</div>
    <div class="q-explanation" id="explanation">
      <span class="exp-label">Explanation</span>
      <p>${currentQ.explanation}</p>
    </div>`;
}

function selectChoice(i) {
  if (answered) return;
  answered = true;
  pracTotal++;
  const correct = currentQ.correct === i;
  if (correct) pracCorrect++;
  document.querySelectorAll('.q-choice').forEach((el, idx) => {
    if (idx === currentQ.correct) el.classList.add('correct');
    else if (idx === i && !correct) el.classList.add('wrong');
  });
  document.getElementById('choice-' + i).classList.add('selected');
  document.getElementById('explanation').classList.add('visible');
  updateScore();
}

function updateScore() {
  document.getElementById('prac-correct').textContent = pracCorrect;
  document.getElementById('prac-total').textContent = pracTotal;
  document.getElementById('prac-pct').textContent = pracTotal ? Math.round(100 * pracCorrect / pracTotal) + '%' : '—';
}

function resetScore() {
  pracCorrect = 0; pracTotal = 0; currentQ = null; answered = false;
  updateScore();
  document.getElementById('questionCard').innerHTML = '<p style="color:#555;font-size:0.85rem;">Click "New Question" to begin a practice session.</p>';
}

// ─── STRATEGY ─────────────────────────────────────────────────────────────────
function renderStrategy() {
  const grid = document.getElementById('stratGrid');
  grid.innerHTML = '';
  STRATEGIES.forEach(s => {
    const card = document.createElement('div');
    card.className = 'strat-card';
    const tips = s.tips.map(t => `<li>${t}</li>`).join('');
    card.innerHTML = `<h4>${s.title}</h4><p>${s.body}</p><ul>${tips}</ul>`;
    grid.appendChild(card);
  });
}

// ─── GLOSSARY ─────────────────────────────────────────────────────────────────
function renderGlossary() {
  const grid = document.getElementById('glossGrid');
  grid.innerHTML = '';
  GLOSSARY.forEach(g => {
    const card = document.createElement('div');
    card.className = 'gloss-card';
    card.dataset.term = g.term.toLowerCase();
    card.dataset.def = g.def.toLowerCase();
    card.innerHTML = `<div class="gloss-term">${g.term}</div><div class="gloss-cat">${g.cat}</div><div class="gloss-def">${g.def}</div>`;
    grid.appendChild(card);
  });
}

function filterGloss() {
  const q = document.getElementById('glossSearch').value.toLowerCase();
  document.querySelectorAll('.gloss-card').forEach(c => {
    c.classList.toggle('hidden', !c.dataset.term.includes(q) && !c.dataset.def.includes(q));
  });
}

// ─── TAB SWITCHING ────────────────────────────────────────────────────────────
function switchMain(id) {
  document.querySelectorAll('.law-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.law-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
  const names = ['curriculum', 'practice', 'strategy', 'glossary'];
  document.querySelectorAll('.law-tab')[names.indexOf(id)].classList.add('active');
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
renderSubjectGrid();
renderStrategy();
renderGlossary();
