// ─── Tab switching ────────────────────────────────────────────────────────────
document.querySelectorAll('#sh-app .sh-tab').forEach(t => {
    t.addEventListener('click', () => {
        document.querySelectorAll('#sh-app .sh-tab').forEach(x => x.classList.remove('active'));
        document.querySelectorAll('#sh-app .sh-panel').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        document.getElementById('tab-' + t.dataset.tab).classList.add('active');
        if (t.dataset.tab === 'bst') renderBST();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SORTING
// ═══════════════════════════════════════════════════════════════════════════════
const COMPLEXITY = {
    bubble:    {best:'O(n)',      avg:'O(n²)',       worst:'O(n²)',       space:'O(1)',     stable:'Yes'},
    selection: {best:'O(n²)',     avg:'O(n²)',       worst:'O(n²)',       space:'O(1)',     stable:'No'},
    insertion: {best:'O(n)',      avg:'O(n²)',       worst:'O(n²)',       space:'O(1)',     stable:'Yes'},
    merge:     {best:'O(n log n)',avg:'O(n log n)',  worst:'O(n log n)', space:'O(n)',     stable:'Yes'},
    quick:     {best:'O(n log n)',avg:'O(n log n)',  worst:'O(n²)',      space:'O(log n)', stable:'No'},
    heap:      {best:'O(n log n)',avg:'O(n log n)',  worst:'O(n log n)', space:'O(1)',     stable:'No'},
};

let dispArr = [], barStates = [], origArr = [];
let sortGen = null, sortPlaying = false, sortDone = false, sortTimer = null;

function randArr(n) {
    return Array.from({length:n}, () => Math.floor(Math.random() * 95) + 5);
}

function renderBars() {
    const viz = document.getElementById('sort-viz');
    const max = Math.max(...dispArr);
    const H = 240;
    viz.innerHTML = '';
    dispArr.forEach((v, i) => {
        const b = document.createElement('div');
        b.className = 'bar ' + (barStates[i] || 'default');
        b.style.height = ((v / max) * H) + 'px';
        viz.appendChild(b);
    });
}

function updateComplexity() {
    const c = COMPLEXITY[document.getElementById('sort-algo').value];
    document.getElementById('c-best').innerHTML   = `Best: <strong>${c.best}</strong>`;
    document.getElementById('c-avg').innerHTML    = `Avg: <strong>${c.avg}</strong>`;
    document.getElementById('c-worst').innerHTML  = `Worst: <strong>${c.worst}</strong>`;
    document.getElementById('c-space').innerHTML  = `Space: <strong>${c.space}</strong>`;
    document.getElementById('c-stable').innerHTML = `Stable: <strong>${c.stable}</strong>`;
}

function applyStep(step) {
    barStates = barStates.map(s => s === 'sorted' ? 'sorted' : 'default');
    if (!step) return;
    if (step.type === 'compare')   { barStates[step.i] = 'compare';   barStates[step.j] = 'compare'; }
    if (step.type === 'swap')      { barStates[step.i] = 'swap';      barStates[step.j] = 'swap'; }
    if (step.type === 'overwrite') { barStates[step.i] = 'overwrite'; }
    if (step.type === 'pivot')     { barStates[step.i] = 'pivot'; }
    if (step.type === 'sorted') {
        const ids = Array.isArray(step.i) ? step.i : [step.i];
        ids.forEach(idx => { barStates[idx] = 'sorted'; });
    }
}

function buildGen() {
    const a = document.getElementById('sort-algo').value;
    if (a === 'bubble')    return bubbleSort(dispArr);
    if (a === 'selection') return selectionSort(dispArr);
    if (a === 'insertion') return insertionSort(dispArr);
    if (a === 'merge')     return mergeSort(dispArr);
    if (a === 'quick')     return quickSort(dispArr, 0, dispArr.length - 1);
    if (a === 'heap')      return heapSort(dispArr);
}

function stepSort() {
    if (sortDone) return;
    if (!sortGen) sortGen = buildGen();
    const r = sortGen.next();
    if (r.done) {
        sortDone = true;
        barStates = new Array(dispArr.length).fill('sorted');
        renderBars();
        document.getElementById('sort-status').textContent = 'Sorted!';
        stopSort(); document.getElementById('sort-play').textContent = '▶ Play';
        return;
    }
    applyStep(r.value);
    renderBars();
}

function stopSort() {
    if (sortTimer) { clearInterval(sortTimer); sortTimer = null; }
    sortPlaying = false;
}

function playSort() {
    if (sortDone) { resetSort(); return; }
    if (sortPlaying) { stopSort(); document.getElementById('sort-play').textContent = '▶ Play'; return; }
    sortPlaying = true;
    document.getElementById('sort-play').textContent = '⏸ Pause';
    const spd = parseInt(document.getElementById('sort-speed').value);
    sortTimer = setInterval(() => {
        stepSort();
        if (sortDone) { document.getElementById('sort-play').textContent = '▶ Play'; }
    }, spd);
}

function initSort() {
    stopSort();
    const n = parseInt(document.getElementById('sort-size').value);
    dispArr = randArr(n); origArr = [...dispArr];
    barStates = new Array(n).fill('default');
    sortGen = null; sortDone = false;
    renderBars(); updateComplexity();
    document.getElementById('sort-status').textContent = 'Ready';
    document.getElementById('sort-play').textContent = '▶ Play';
}

function resetSort() {
    stopSort();
    dispArr = [...origArr];
    barStates = new Array(dispArr.length).fill('default');
    sortGen = null; sortDone = false;
    renderBars();
    document.getElementById('sort-status').textContent = 'Reset';
    document.getElementById('sort-play').textContent = '▶ Play';
}

// ── Algorithms ────────────────────────────────────────────────────────────────
function* bubbleSort(a) {
    const n = a.length;
    for (let i = 0; i < n - 1; i++) {
        for (let j = 0; j < n - i - 1; j++) {
            yield {type:'compare', i:j, j:j+1};
            if (a[j] > a[j+1]) { [a[j],a[j+1]]=[a[j+1],a[j]]; yield {type:'swap',i:j,j:j+1}; }
        }
        yield {type:'sorted', i: n-i-1};
    }
    yield {type:'sorted', i:0};
}

function* selectionSort(a) {
    const n = a.length;
    for (let i = 0; i < n - 1; i++) {
        let m = i; yield {type:'pivot', i:m};
        for (let j = i+1; j < n; j++) {
            yield {type:'compare', i:m, j};
            if (a[j] < a[m]) { m = j; yield {type:'pivot', i:m}; }
        }
        if (m !== i) { [a[i],a[m]]=[a[m],a[i]]; yield {type:'swap', i, j:m}; }
        yield {type:'sorted', i};
    }
    yield {type:'sorted', i: a.length-1};
}

function* insertionSort(a) {
    const n = a.length;
    yield {type:'sorted', i:0};
    for (let i = 1; i < n; i++) {
        const key = a[i]; let j = i - 1;
        while (j >= 0) {
            yield {type:'compare', i:j, j:j+1};
            if (a[j] > key) { a[j+1]=a[j]; yield {type:'overwrite', i:j+1, val:a[j]}; j--; }
            else break;
        }
        a[j+1] = key; yield {type:'overwrite', i:j+1, val:key};
        yield {type:'sorted', i: Array.from({length:i+1},(_,k)=>k)};
    }
}

function* mergeSort(a) {
    yield* _mergeSort(a, 0, a.length-1);
    yield {type:'sorted', i: Array.from({length:a.length},(_,k)=>k)};
}
function* _mergeSort(a, l, r) {
    if (l >= r) return;
    const m = l + r >> 1;
    yield* _mergeSort(a, l, m);
    yield* _mergeSort(a, m+1, r);
    yield* _merge(a, l, m, r);
}
function* _merge(a, l, m, r) {
    const L = a.slice(l, m+1), R = a.slice(m+1, r+1);
    let i=0, j=0, k=l;
    while (i < L.length && j < R.length) {
        yield {type:'compare', i:l+i, j:m+1+j};
        a[k] = L[i] <= R[j] ? L[i++] : R[j++];
        yield {type:'overwrite', i:k, val:a[k]}; k++;
    }
    while (i < L.length) { a[k]=L[i++]; yield {type:'overwrite',i:k,val:a[k]}; k++; }
    while (j < R.length) { a[k]=R[j++]; yield {type:'overwrite',i:k,val:a[k]}; k++; }
}

function* quickSort(a, lo, hi) {
    if (lo >= hi) { if (lo === hi) yield {type:'sorted',i:lo}; return; }
    const p = yield* _partition(a, lo, hi);
    yield {type:'sorted', i:p};
    yield* quickSort(a, lo, p-1);
    yield* quickSort(a, p+1, hi);
}
function* _partition(a, lo, hi) {
    const pv = a[hi]; yield {type:'pivot', i:hi}; let i = lo-1;
    for (let j = lo; j < hi; j++) {
        yield {type:'compare', i:j, j:hi};
        if (a[j] <= pv) { i++; [a[i],a[j]]=[a[j],a[i]]; if(i!==j) yield {type:'swap',i,j}; }
    }
    [a[i+1],a[hi]]=[a[hi],a[i+1]]; yield {type:'swap',i:i+1,j:hi};
    return i+1;
}

function* heapSort(a) {
    const n = a.length;
    for (let i = (n>>1)-1; i >= 0; i--) yield* _heapify(a,n,i);
    for (let i = n-1; i > 0; i--) {
        [a[0],a[i]]=[a[i],a[0]]; yield {type:'swap',i:0,j:i};
        yield {type:'sorted',i};
        yield* _heapify(a,i,0);
    }
    yield {type:'sorted',i:0};
}
function* _heapify(a, n, i) {
    let lg=i, l=2*i+1, r=2*i+2;
    if (l<n) { yield {type:'compare',i:lg,j:l}; if(a[l]>a[lg]) lg=l; }
    if (r<n) { yield {type:'compare',i:lg,j:r}; if(a[r]>a[lg]) lg=r; }
    if (lg !== i) { [a[i],a[lg]]=[a[lg],a[i]]; yield {type:'swap',i,j:lg}; yield* _heapify(a,n,lg); }
}

// ── Sort event wiring ─────────────────────────────────────────────────────────
document.getElementById('sort-new').addEventListener('click', initSort);
document.getElementById('sort-play').addEventListener('click', playSort);
document.getElementById('sort-step').addEventListener('click', () => { if (!sortPlaying) stepSort(); });
document.getElementById('sort-reset').addEventListener('click', resetSort);
document.getElementById('sort-algo').addEventListener('change', () => { resetSort(); updateComplexity(); });
document.getElementById('sort-size').addEventListener('input', function() {
    document.getElementById('size-lbl').textContent = this.value + ' bars';
    initSort();
});
document.getElementById('sort-speed').addEventListener('change', () => {
    if (sortPlaying) { stopSort(); playSort(); }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  PATHFINDING
// ═══════════════════════════════════════════════════════════════════════════════
const ROWS=18, COLS=32;
const EMPTY=0, WALL=1, VISITED=4, PATH=6;
let grid=[], startCell=[2,2], endCell=[ROWS-3,COLS-3];
let mouseDown=false, drawMode=null, pathRunning=false;

function initGrid() { grid = Array.from({length:ROWS}, ()=>new Array(COLS).fill(EMPTY)); }

function cellClass(r,c) {
    if (r===startCell[0]&&c===startCell[1]) return 'start';
    if (r===endCell[0]  &&c===endCell[1])   return 'end';
    const v=grid[r][c];
    if (v===WALL)    return 'wall';
    if (v===VISITED) return 'visited';
    if (v===PATH)    return 'path';
    return 'empty';
}

function renderGrid() {
    const g = document.getElementById('path-grid');
    g.style.gridTemplateColumns = `repeat(${COLS},20px)`;
    g.style.gridTemplateRows    = `repeat(${ROWS},20px)`;
    g.innerHTML = '';
    for (let r=0; r<ROWS; r++) for (let c=0; c<COLS; c++) {
        const el = document.createElement('div');
        el.className = 'cell '+cellClass(r,c);
        el.dataset.r=r; el.dataset.c=c;
        g.appendChild(el);
    }
}

function updateCell(r,c) {
    const el = document.getElementById('path-grid').children[r*COLS+c];
    if (el) el.className = 'cell '+cellClass(r,c);
}

function isStart(r,c){return r===startCell[0]&&c===startCell[1];}
function isEnd(r,c){return r===endCell[0]&&c===endCell[1];}

function interact(r,c) {
    if (drawMode==='move-start'){startCell=[r,c];renderGrid();return;}
    if (drawMode==='move-end')  {endCell=[r,c];  renderGrid();return;}
    if (isStart(r,c)||isEnd(r,c)) return;
    if (drawMode==='wall')  {grid[r][c]=WALL;  updateCell(r,c);}
    if (drawMode==='erase') {grid[r][c]=EMPTY; updateCell(r,c);}
}

const pathGrid = document.getElementById('path-grid');
pathGrid.addEventListener('mousedown', e => {
    if (pathRunning) return;
    const el=e.target.closest('.cell'); if(!el) return;
    const r=+el.dataset.r, c=+el.dataset.c;
    mouseDown=true;
    if (isStart(r,c))      drawMode='move-start';
    else if (isEnd(r,c))   drawMode='move-end';
    else drawMode = grid[r][c]===WALL?'erase':'wall';
    interact(r,c);
});
document.addEventListener('mousemove', e => {
    if (!mouseDown||pathRunning) return;
    const el=e.target.closest('.cell'); if(!el) return;
    interact(+el.dataset.r, +el.dataset.c);
});
document.addEventListener('mouseup', ()=>{mouseDown=false; drawMode=null;});

// ── Path algorithms ──────────────────────────────────────────────────────────
function neighbors(r,c) {
    return [[-1,0],[1,0],[0,-1],[0,1]]
        .map(([dr,dc])=>[r+dr,c+dc])
        .filter(([nr,nc])=>nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&grid[nr][nc]!==WALL);
}

function buildPath(prev,er,ec){
    const p=[]; let cur=[er,ec];
    while(cur){p.unshift(cur);cur=prev[cur[0]][cur[1]];}
    return p;
}

function makePrev(){return Array.from({length:ROWS},()=>new Array(COLS).fill(null));}
function makeGrid(def){return Array.from({length:ROWS},()=>new Array(COLS).fill(def));}

function bfsPath(){
    const [sr,sc]=[...startCell],[er,ec]=[...endCell];
    const vis=makeGrid(false),prev=makePrev(),q=[[sr,sc]],vo=[];
    vis[sr][sc]=true;
    while(q.length){
        const [r,c]=q.shift(); vo.push([r,c]);
        if(r===er&&c===ec) return {vo,path:buildPath(prev,er,ec),found:true};
        for(const [nr,nc] of neighbors(r,c)) if(!vis[nr][nc]){vis[nr][nc]=true;prev[nr][nc]=[r,c];q.push([nr,nc]);}
    }
    return {vo,path:[],found:false};
}

function dfsPath(){
    const [sr,sc]=[...startCell],[er,ec]=[...endCell];
    const vis=makeGrid(false),prev=makePrev(),stack=[[sr,sc]],vo=[];
    while(stack.length){
        const [r,c]=stack.pop();
        if(vis[r][c]) continue; vis[r][c]=true; vo.push([r,c]);
        if(r===er&&c===ec) return {vo,path:buildPath(prev,er,ec),found:true};
        for(const [nr,nc] of neighbors(r,c)) if(!vis[nr][nc]){prev[nr][nc]=[r,c];stack.push([nr,nc]);}
    }
    return {vo,path:[],found:false};
}

function dijkstraPath(){
    const [sr,sc]=[...startCell],[er,ec]=[...endCell];
    const dist=makeGrid(Infinity),prev=makePrev(),vis=makeGrid(false);
    dist[sr][sc]=0;
    const pq=[[0,sr,sc]],vo=[];
    while(pq.length){
        pq.sort((a,b)=>a[0]-b[0]);
        const [d,r,c]=pq.shift();
        if(vis[r][c]) continue; vis[r][c]=true; vo.push([r,c]);
        if(r===er&&c===ec) return {vo,path:buildPath(prev,er,ec),found:true};
        for(const [nr,nc] of neighbors(r,c)){
            const nd=d+1;
            if(nd<dist[nr][nc]){dist[nr][nc]=nd;prev[nr][nc]=[r,c];pq.push([nd,nr,nc]);}
        }
    }
    return {vo,path:[],found:false};
}

function heur(r,c,er,ec){return Math.abs(r-er)+Math.abs(c-ec);}
function astarPath(){
    const [sr,sc]=[...startCell],[er,ec]=[...endCell];
    const g=makeGrid(Infinity),prev=makePrev(),closed=makeGrid(false);
    g[sr][sc]=0;
    const open=[[heur(sr,sc,er,ec),sr,sc]],vo=[];
    while(open.length){
        open.sort((a,b)=>a[0]-b[0]);
        const [,r,c]=open.shift();
        if(closed[r][c]) continue; closed[r][c]=true; vo.push([r,c]);
        if(r===er&&c===ec) return {vo,path:buildPath(prev,er,ec),found:true};
        for(const [nr,nc] of neighbors(r,c)){
            if(closed[nr][nc]) continue;
            const ng=g[r][c]+1;
            if(ng<g[nr][nc]){g[nr][nc]=ng;prev[nr][nc]=[r,c];open.push([ng+heur(nr,nc,er,ec),nr,nc]);}
        }
    }
    return {vo,path:[],found:false};
}

function msDelay(ms){return new Promise(r=>setTimeout(r,ms));}

async function runPath(){
    if(pathRunning) return;
    pathRunning=true;
    // clear old result
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++)
        if(grid[r][c]===VISITED||grid[r][c]===PATH) grid[r][c]=EMPTY;
    renderGrid();
    document.getElementById('path-info').textContent='Searching…';
    const a=document.getElementById('path-algo').value;
    const res=a==='bfs'?bfsPath():a==='dfs'?dfsPath():a==='dijkstra'?dijkstraPath():astarPath();
    const [sr,sc]=[...startCell],[er,ec]=[...endCell];
    for(const [r,c] of res.vo){
        if((r===sr&&c===sc)||(r===er&&c===ec)) continue;
        grid[r][c]=VISITED; updateCell(r,c); await msDelay(10);
    }
    if(res.found){
        for(const [r,c] of res.path){
            if((r===sr&&c===sc)||(r===er&&c===ec)) continue;
            grid[r][c]=PATH; updateCell(r,c); await msDelay(28);
        }
        document.getElementById('path-info').textContent=
            `Path found! ${res.path.length-2} steps · ${res.vo.length} cells visited.`;
    } else {
        document.getElementById('path-info').textContent='No path found.';
    }
    pathRunning=false;
}

// ── Maze (recursive division) ─────────────────────────────────────────────────
function generateMaze(){
    if(pathRunning) return;
    initGrid();
    divide(1,1,ROWS-2,COLS-2,true);
    grid[startCell[0]][startCell[1]]=EMPTY;
    grid[endCell[0]][endCell[1]]=EMPTY;
    renderGrid();
    document.getElementById('path-info').textContent='Maze ready. Click "Find Path" to solve.';
}
function divide(rMin,cMin,rMax,cMax,horiz){
    if(rMax-rMin<2||cMax-cMin<2) return;
    if(horiz){
        const wr=rMin+1+2*Math.floor(Math.random()*Math.floor((rMax-rMin)/2));
        const pc=cMin+2*Math.floor(Math.random()*Math.ceil((cMax-cMin+1)/2));
        for(let c=cMin;c<=cMax;c++) if(c!==pc) grid[wr][c]=WALL;
        divide(rMin,cMin,wr-1,cMax,!horiz);
        divide(wr+1,cMin,rMax,cMax,!horiz);
    } else {
        const wc=cMin+1+2*Math.floor(Math.random()*Math.floor((cMax-cMin)/2));
        const pr=rMin+2*Math.floor(Math.random()*Math.ceil((rMax-rMin+1)/2));
        for(let r=rMin;r<=rMax;r++) if(r!==pr) grid[r][wc]=WALL;
        divide(rMin,cMin,rMax,wc-1,!horiz);
        divide(rMin,wc+1,rMax,cMax,!horiz);
    }
}

document.getElementById('path-run').addEventListener('click', runPath);
document.getElementById('path-maze').addEventListener('click', generateMaze);
document.getElementById('path-clear-walls').addEventListener('click', ()=>{
    if(pathRunning) return;
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) if(grid[r][c]===WALL) grid[r][c]=EMPTY;
    renderGrid();
});
document.getElementById('path-reset').addEventListener('click', ()=>{
    if(pathRunning) return;
    initGrid(); renderGrid();
    document.getElementById('path-info').textContent='Click/drag to draw walls. Drag the start/end circles to reposition them.';
});

// ═══════════════════════════════════════════════════════════════════════════════
//  BINARY SEARCH TREE
// ═══════════════════════════════════════════════════════════════════════════════
class BSTNode{ constructor(v){this.val=v;this.left=null;this.right=null;} }

class BST {
    constructor(){this.root=null;}
    insert(v){
        const node=new BSTNode(v);
        if(!this.root){this.root=node;return;}
        let cur=this.root;
        for(;;){
            if(v===cur.val) return;
            if(v<cur.val){ if(!cur.left){cur.left=node;return;} cur=cur.left; }
            else          { if(!cur.right){cur.right=node;return;} cur=cur.right; }
        }
    }
    delete(v){this.root=this._del(this.root,v);}
    _del(n,v){
        if(!n) return null;
        if(v<n.val) n.left=this._del(n.left,v);
        else if(v>n.val) n.right=this._del(n.right,v);
        else{
            if(!n.left) return n.right;
            if(!n.right) return n.left;
            let s=n.right; while(s.left) s=s.left;
            n.val=s.val; n.right=this._del(n.right,s.val);
        }
        return n;
    }
    inorder(){const r=[];const t=n=>{if(!n)return;t(n.left);r.push(n.val);t(n.right);};t(this.root);return r;}
    height(){const h=n=>n?1+Math.max(h(n.left),h(n.right)):0;return h(this.root);}
}

const bst=new BST();
let bstAnimating=false;
const SVG_NS='http://www.w3.org/2000/svg';
const NR=18, VSTEP=64;

function layout(){
    const pos=new Map(); let ctr=0;
    function assign(n,d){if(!n)return;assign(n.left,d+1);pos.set(n,{x:ctr++,y:d});assign(n.right,d+1);}
    assign(bst.root,0); return pos;
}

function renderBST(hl=new Set(), hlColor=null){
    const svg=document.getElementById('bst-svg');
    svg.innerHTML='';
    if(!bst.root) return;
    const pos=layout();
    const n=pos.size;
    const svgW=svg.clientWidth||680;
    const H=(bst.height()+1)*VSTEP+30;
    const vbW=Math.max(svgW, n*52+40);
    svg.setAttribute('viewBox',`0 0 ${vbW} ${H}`);
    const pad=28, avail=vbW-pad*2;
    const sx=x=>n<=1?avail/2+pad:pad+(x/(n-1))*avail;
    const sy=y=>28+y*VSTEP;

    // edges
    pos.forEach((p,node)=>{
        [node.left,node.right].forEach(child=>{
            if(!child) return;
            const cp=pos.get(child);
            const line=document.createElementNS(SVG_NS,'line');
            line.setAttribute('x1',sx(p.x)); line.setAttribute('y1',sy(p.y));
            line.setAttribute('x2',sx(cp.x)); line.setAttribute('y2',sy(cp.y));
            line.setAttribute('stroke','#2a2a3a'); line.setAttribute('stroke-width','2');
            svg.appendChild(line);
        });
    });
    // nodes
    pos.forEach((p,node)=>{
        const isHl=hl.has(node.val);
        const cx=sx(p.x), cy=sy(p.y);
        const circle=document.createElementNS(SVG_NS,'circle');
        circle.setAttribute('cx',cx); circle.setAttribute('cy',cy); circle.setAttribute('r',NR);
        circle.setAttribute('fill', isHl&&hlColor?hlColor:'#1a1a26');
        circle.setAttribute('stroke', isHl&&hlColor?hlColor:'#7c3aed');
        circle.setAttribute('stroke-width','2');
        svg.appendChild(circle);
        const text=document.createElementNS(SVG_NS,'text');
        text.setAttribute('x',cx); text.setAttribute('y',cy+5);
        text.setAttribute('text-anchor','middle');
        text.setAttribute('font-family','Courier New,monospace');
        text.setAttribute('font-size','12');
        text.setAttribute('fill',isHl&&hlColor?'#111':'#e2e8f0');
        text.textContent=node.val;
        svg.appendChild(text);
    });
    // traversal display
    const io=bst.inorder();
    document.getElementById('bst-trav').innerHTML=
        `<strong>In-order:</strong> ${io.join(' → ')}&nbsp;&nbsp;<strong>Height:</strong> ${bst.height()}`;
}

async function animateSearch(v){
    if(bstAnimating) return; bstAnimating=true;
    let cur=bst.root; const path=[];
    while(cur){
        path.push(cur.val); renderBST(new Set(path),'#3b82f6'); await msDelay(420);
        if(cur.val===v){
            renderBST(new Set([v]),'#10b981');
            document.getElementById('bst-info').textContent=`Found ${v} after ${path.length} comparison(s).`;
            await msDelay(700); renderBST(); bstAnimating=false; return;
        }
        cur=v<cur.val?cur.left:cur.right;
    }
    renderBST(new Set(path),'#ef4444');
    document.getElementById('bst-info').textContent=`${v} not in tree.`;
    await msDelay(700); renderBST(); bstAnimating=false;
}

document.getElementById('bst-insert').addEventListener('click',()=>{
    if(bstAnimating) return;
    const v=parseInt(document.getElementById('bst-val').value);
    if(isNaN(v)||v<1||v>999){document.getElementById('bst-info').textContent='Enter a value 1–999.';return;}
    bst.insert(v); renderBST();
    document.getElementById('bst-info').textContent=`Inserted ${v}.`;
    document.getElementById('bst-val').value='';
});
document.getElementById('bst-search').addEventListener('click',()=>{
    if(bstAnimating) return;
    const v=parseInt(document.getElementById('bst-val').value);
    if(isNaN(v)){document.getElementById('bst-info').textContent='Enter a value to search.';return;}
    if(!bst.root){document.getElementById('bst-info').textContent='Tree is empty.';return;}
    animateSearch(v);
});
document.getElementById('bst-delete').addEventListener('click',()=>{
    if(bstAnimating) return;
    const v=parseInt(document.getElementById('bst-val').value);
    if(isNaN(v)){document.getElementById('bst-info').textContent='Enter a value to delete.';return;}
    const before=bst.inorder().length; bst.delete(v); renderBST();
    document.getElementById('bst-info').textContent=
        bst.inorder().length<before?`Deleted ${v}.`:`${v} not in tree.`;
    document.getElementById('bst-val').value='';
});
document.getElementById('bst-random').addEventListener('click',()=>{
    if(bstAnimating) return;
    bst.root=null;
    const vals=new Set(); while(vals.size<12) vals.add(Math.floor(Math.random()*90)+5);
    vals.forEach(v=>bst.insert(v)); renderBST();
    document.getElementById('bst-info').textContent='Random tree generated.';
});
document.getElementById('bst-clear').addEventListener('click',()=>{
    if(bstAnimating) return;
    bst.root=null; renderBST();
    document.getElementById('bst-info').textContent='Tree cleared.';
    document.getElementById('bst-trav').innerHTML='';
});
document.getElementById('bst-val').addEventListener('keydown',e=>{
    if(e.key==='Enter') document.getElementById('bst-insert').click();
});

// ─── Init ─────────────────────────────────────────────────────────────────────
initSort();
initGrid(); renderGrid();

// ─── Glossary accordion ───────────────────────────────────────────────────────
document.querySelectorAll('#sh-app .gl-q').forEach(q => {
    q.addEventListener('click', () => {
        q.classList.toggle('open');
        q.nextElementSibling.classList.toggle('open');
    });
});
