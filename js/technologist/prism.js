'use strict';

    // ════════════════════════════════════════════════════════════════════════
    //  DATA MODEL
    // ════════════════════════════════════════════════════════════════════════

    let DS = { headers: [], rows: [], types: [] }; // types: 'numeric' | 'text'
    let chartType = 'bar';

    const COLORS = ['#4fc3f7','#81c784','#e57373','#ffb74d','#ce93d8','#80cbc4','#fff176','#ff8a65'];

    // ════════════════════════════════════════════════════════════════════════
    //  STATISTICS MODULE
    // ════════════════════════════════════════════════════════════════════════

    const S = {
        mean:   a => a.reduce((s,v)=>s+v,0)/a.length,
        sum:    a => a.reduce((s,v)=>s+v,0),
        min:    a => Math.min(...a),
        max:    a => Math.max(...a),
        sorted: a => [...a].sort((x,y)=>x-y),
        median(a) { const s=this.sorted(a),n=s.length; return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2; },
        mode(a) {
            const f={}; a.forEach(v=>{f[v]=(f[v]||0)+1;});
            const mx=Math.max(...Object.values(f));
            if (mx===1) return null;
            return Object.keys(f).filter(k=>f[k]===mx).map(Number);
        },
        variance(a, pop=true) { const m=this.mean(a); return a.reduce((s,v)=>s+(v-m)**2,0)/(pop?a.length:a.length-1); },
        std(a, pop=true) { return Math.sqrt(this.variance(a,pop)); },
        cv(a) { const m=this.mean(a); return m===0?null:this.std(a)/Math.abs(m)*100; },
        pct(a, p) { const s=this.sorted(a),pos=(s.length-1)*p/100,lo=Math.floor(pos),hi=Math.ceil(pos); return lo===hi?s[lo]:s[lo]+(pos-lo)*(s[hi]-s[lo]); },
        q1(a) { return this.pct(a,25); },
        q3(a) { return this.pct(a,75); },
        iqr(a) { return this.q3(a)-this.q1(a); },
        skew(a) {
            const m=this.mean(a),s=this.std(a,false),n=a.length;
            if(s===0) return 0;
            return (n/((n-1)*(n-2)))*a.reduce((sum,v)=>sum+((v-m)/s)**3,0);
        },
        kurt(a) {
            const m=this.mean(a),s=this.std(a,false),n=a.length;
            if(s===0) return 0;
            return a.reduce((sum,v)=>sum+((v-m)/s)**4,0)/n - 3;
        },
        pearson(x,y) {
            if(x.length!==y.length||x.length<2) return null;
            const mx=this.mean(x),my=this.mean(y);
            const num=x.reduce((s,xi,i)=>s+(xi-mx)*(y[i]-my),0);
            const den=Math.sqrt(x.reduce((s,xi)=>s+(xi-mx)**2,0)*y.reduce((s,yi)=>s+(yi-my)**2,0));
            return den===0?null:num/den;
        },
        linreg(y) {
            const n=y.length, x=Array.from({length:n},(_,i)=>i);
            const mx=this.mean(x),my=this.mean(y);
            const num=x.reduce((s,xi,i)=>s+(xi-mx)*(y[i]-my),0);
            const den=x.reduce((s,xi)=>s+(xi-mx)**2,0);
            const slope=den===0?0:num/den, b=my-slope*mx;
            const yhat=x.map(xi=>slope*xi+b);
            const ssTot=y.reduce((s,yi)=>s+(yi-my)**2,0);
            const ssRes=y.reduce((s,yi,i)=>s+(yi-yhat[i])**2,0);
            return { slope, intercept:b, r2: ssTot===0?1:1-ssRes/ssTot, next: slope*(n)+b };
        },
    };

    // ════════════════════════════════════════════════════════════════════════
    //  HELPERS
    // ════════════════════════════════════════════════════════════════════════

    function fmt(n, dp=2) {
        if (!isFinite(n)) return '—';
        if (Math.abs(n)>=1e9) return (n/1e9).toFixed(dp)+'B';
        if (Math.abs(n)>=1e6) return (n/1e6).toFixed(dp)+'M';
        if (Math.abs(n)>=1e4) return n.toLocaleString(undefined,{maximumFractionDigits:dp});
        return n.toFixed(dp).replace(/\.?0+$/,'');
    }

    function numCol(ci) {
        return DS.rows.map(r=>parseFloat(r[ci])).filter(v=>!isNaN(v));
    }

    function detectTypes() {
        DS.types = DS.headers.map((_,ci) => {
            const vals = DS.rows.map(r=>r[ci]).filter(v=>v!==''&&v!==null&&v!==undefined);
            if (!vals.length) return 'text';
            const n = vals.filter(v=>!isNaN(parseFloat(v))&&v.toString().trim()!=='').length;
            return n/vals.length >= 0.75 ? 'numeric' : 'text';
        });
    }

    function updateInfo() {
        document.getElementById('data-info').textContent =
            DS.rows.length + ' rows × ' + DS.headers.length + ' columns  (' +
            DS.types.filter(t=>t==='numeric').length + ' numeric, ' +
            DS.types.filter(t=>t==='text').length + ' text)';
    }

    function niceTicks(mn, mx, n=6) {
        if (mn===mx) return [mn];
        const range=mx-mn, rough=range/n;
        const mag=Math.pow(10,Math.floor(Math.log10(rough)));
        const step=[1,2,2.5,5,10].find(s=>s*mag>=rough)*mag;
        const start=Math.ceil(mn/step)*step;
        const ticks=[];
        for(let t=start; t<=mx+step*0.01&&ticks.length<=n+2; t+=step)
            ticks.push(parseFloat(t.toPrecision(10)));
        return ticks;
    }

    // ════════════════════════════════════════════════════════════════════════
    //  CSV PARSING
    // ════════════════════════════════════════════════════════════════════════

    function parseCSVText(text) {
        const lines = text.split(/\r?\n/).filter(l=>l.trim());
        if (!lines.length) return;
        function parseLine(line) {
            const out=[]; let cur='',inQ=false;
            for(const ch of line) {
                if(ch==='"'){inQ=!inQ;}
                else if((ch===','||ch==='\t')&&!inQ){out.push(cur.trim());cur='';}
                else cur+=ch;
            }
            out.push(cur.trim()); return out;
        }
        DS.headers = parseLine(lines[0]);
        DS.rows = lines.slice(1).map(l=>{
            const r=parseLine(l);
            while(r.length<DS.headers.length) r.push('');
            return r.slice(0,DS.headers.length);
        }).filter(r=>r.some(c=>c!==''));
        detectTypes();
        afterLoad();
    }

    function parsePaste() {
        const text = document.getElementById('paste-area').value.trim();
        if (!text) { alert('Paste some data first.'); return; }
        parseCSVText(text);
        document.getElementById('paste-area').value = '';
    }

    function afterLoad() {
        renderTable();
        updateInfo();
        // reset chart selectors if on chart tab
        if (document.getElementById('tab-charts').style.display !== 'none') populateSelectors();
    }

    // ════════════════════════════════════════════════════════════════════════
    //  SAMPLE DATA
    // ════════════════════════════════════════════════════════════════════════

    const SAMPLES = {
        sales: `Month,Revenue,Units_Sold,Avg_Price,Profit_Margin_Pct
January,45200,234,193.2,22.3
February,48100,251,191.6,23.1
March,52300,278,188.1,24.5
April,49800,260,191.5,22.8
May,55600,289,192.4,25.2
June,58900,304,193.8,26.1
July,57200,295,193.9,25.7
August,61400,318,193.1,27.3
September,63800,329,193.9,28.1
October,67200,346,194.2,28.9
November,71500,367,194.8,29.6
December,78900,402,196.3,31.2`,

        market: `Sector,Market_Cap_B,Revenue_B,PE_Ratio,Dividend_Yield_Pct,YTD_Return_Pct,Volatility
Technology,2840,425,28.4,0.8,18.2,24.1
Healthcare,1250,186,22.1,2.1,9.4,16.8
Finance,980,142,14.2,3.4,12.7,19.3
Consumer,760,198,19.8,1.9,7.3,14.2
Energy,540,98,12.3,4.2,-3.1,28.6
Utilities,320,62,18.6,3.8,4.2,11.4
Materials,280,54,16.4,2.6,6.8,18.9
Real_Estate,240,48,21.3,3.1,3.4,17.2`,

        hr: `Department,Headcount,Avg_Salary_K,Satisfaction,Turnover_Pct,Productivity,Training_Days
Engineering,145,98,7.8,8.2,84,12
Marketing,62,74,7.2,12.1,76,8
Sales,89,68,6.9,18.4,71,6
HR,34,72,7.9,7.1,79,10
Finance,51,88,7.5,6.4,82,9
Operations,112,65,6.7,14.2,74,7
Legal,23,105,8.1,4.8,87,11
Product,78,92,8.3,5.9,88,14`,
    };

    function loadSample(name) {
        parseCSVText(SAMPLES[name]);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  TABLE RENDERING
    // ════════════════════════════════════════════════════════════════════════

    function renderTable() {
        const wrap = document.getElementById('table-wrap');
        if (!DS.headers.length) {
            wrap.innerHTML = '<div class="empty-data">No data loaded.</div>';
            return;
        }
        const tbl = document.createElement('table');
        tbl.className = 'data-tbl';

        // Head
        const thead = tbl.createTHead();
        const hr = thead.insertRow();
        const th0 = document.createElement('th'); th0.className='rn-th'; th0.textContent='#'; hr.appendChild(th0);

        DS.headers.forEach((h, ci) => {
            const th = document.createElement('th');
            const wrap2 = document.createElement('div'); wrap2.className='col-hdr-wrap';
            const inp = document.createElement('input'); inp.className='col-hdr-input'; inp.value=h; inp.size=Math.min(h.length+1,14);
            inp.addEventListener('change',()=>{ DS.headers[ci]=inp.value; detectTypes(); });
            const badge = document.createElement('span');
            badge.className='col-type-badge '+DS.types[ci];
            badge.textContent=DS.types[ci]==='numeric'?'#':'T';
            badge.title=DS.types[ci];
            const del = document.createElement('button'); del.className='col-del'; del.textContent='×'; del.title='Delete column';
            del.addEventListener('click',()=>delCol(ci));
            wrap2.appendChild(inp); wrap2.appendChild(badge); wrap2.appendChild(del);
            th.appendChild(wrap2); hr.appendChild(th);
        });

        // Body
        const tbody = tbl.createTBody();
        DS.rows.forEach((row, ri) => {
            const tr = tbody.insertRow();
            const td0 = tr.insertCell(); td0.className='rn-cell'; td0.textContent=ri+1;
            row.forEach((val, ci) => {
                const td = tr.insertCell();
                td.className = DS.types[ci]==='numeric' ? 'numeric' : '';
                td.contentEditable='true'; td.textContent=val;
                td.addEventListener('blur',()=>{ DS.rows[ri][ci]=td.textContent.trim(); detectTypes(); updateInfo(); });
            });
        });

        wrap.innerHTML=''; wrap.appendChild(tbl);
        updateInfo();
    }

    function addRow() {
        if (!DS.headers.length) return;
        DS.rows.push(DS.headers.map(()=>''));
        renderTable();
    }

    function addCol() {
        const name = prompt('Column name:', 'Column '+(DS.headers.length+1));
        if (!name) return;
        DS.headers.push(name); DS.types.push('text');
        DS.rows.forEach(r=>r.push(''));
        renderTable();
    }

    function delCol(ci) {
        if (!confirm('Delete column "'+DS.headers[ci]+'"?')) return;
        DS.headers.splice(ci,1); DS.types.splice(ci,1);
        DS.rows.forEach(r=>r.splice(ci,1));
        detectTypes(); renderTable();
    }

    function clearData() {
        if (!confirm('Clear all data?')) return;
        DS = {headers:[],rows:[],types:[]};
        renderTable();
        document.getElementById('data-info').textContent='No data loaded';
    }

    function exportCSV() {
        if (!DS.headers.length) return;
        const lines = [DS.headers, ...DS.rows].map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(','));
        const blob = new Blob([lines.join('\n')],{type:'text/csv'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href=url; a.download='prism-data.csv'; a.click();
        setTimeout(()=>URL.revokeObjectURL(url),2000);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  STATISTICS PANEL
    // ════════════════════════════════════════════════════════════════════════

    function renderStats() {
        const hasData = DS.headers.length && DS.rows.length;
        document.getElementById('stats-empty').style.display   = hasData ? 'none' : '';
        document.getElementById('stats-content').style.display = hasData ? ''     : 'none';
        if (!hasData) return;

        const grid = document.getElementById('stats-grid');
        grid.innerHTML = '';
        const numCols = DS.headers.map((_,i)=>i).filter(i=>DS.types[i]==='numeric');

        numCols.forEach(ci => {
            const vals = numCol(ci);
            if (!vals.length) return;
            const mn=S.min(vals),mx=S.max(vals),me=S.mean(vals),md=S.median(vals);
            const sd=S.std(vals),v=S.variance(vals),cv=S.cv(vals);
            const q1=S.q1(vals),q3=S.q3(vals),iqr=S.iqr(vals);
            const sk=S.skew(vals),kt=S.kurt(vals);
            const mode=S.mode(vals);
            const rows2=[
                ['Count',vals.length],['Mean',fmt(me)],
                ['Median',fmt(md)],['Mode',mode?mode.slice(0,2).map(v=>fmt(v)).join(', '):'—'],
                ['Std Dev',fmt(sd)],['Variance',fmt(v)],
                ['Min',fmt(mn)],['Max',fmt(mx)],
                ['Range',fmt(mx-mn)],['Q1',fmt(q1)],
                ['Q3',fmt(q3)],['IQR',fmt(iqr)],
                ['CV',cv!==null?fmt(cv,1)+'%':'—'],['Skewness',fmt(sk,3)],
                ['Kurtosis',fmt(kt,3)],['Sum',fmt(S.sum(vals))],
            ];
            const card = document.createElement('div'); card.className='stat-card';
            const hdr = document.createElement('div'); hdr.className='stat-card-hdr';
            const name = document.createElement('div'); name.className='stat-col-name';
            name.textContent=DS.headers[ci];
            const badge = document.createElement('span'); badge.className='col-type-badge numeric'; badge.textContent='#';
            hdr.appendChild(name); hdr.appendChild(badge);
            const bar = document.createElement('div'); bar.className='stat-mini-bar';
            bar.style.background=`linear-gradient(to right, ${COLORS[ci%COLORS.length]}, rgba(244,162,97,0.4))`;
            const tbl = document.createElement('table'); tbl.className='stat-table';
            rows2.forEach(([k,v2])=>{
                const tr=tbl.insertRow();
                const td1=tr.insertCell(); td1.textContent=k;
                const td2=tr.insertCell(); td2.textContent=v2;
            });
            card.appendChild(hdr); card.appendChild(bar); card.appendChild(tbl);
            grid.appendChild(card);
        });

        // Correlation matrix
        const corrWrap = document.getElementById('corr-section');
        corrWrap.innerHTML = '';
        if (numCols.length < 2) { corrWrap.innerHTML='<div class="empty-data">Need ≥ 2 numeric columns for correlation.</div>'; return; }

        const ctbl = document.createElement('table'); ctbl.className='corr-table';
        const hr = ctbl.insertRow();
        const th0 = document.createElement('th'); th0.textContent=''; hr.appendChild(th0);
        numCols.forEach(ci=>{ const th=document.createElement('th'); th.textContent=DS.headers[ci]; hr.appendChild(th); });

        numCols.forEach(ri=>{
            const tr = ctbl.insertRow();
            const th = document.createElement('th'); th.textContent=DS.headers[ri]; tr.appendChild(th);
            const av = numCol(ri);
            numCols.forEach(ci=>{
                const td = tr.insertCell(); td.className='corr-cell';
                if (ri===ci) { td.textContent='1.00'; td.style.color='#555'; return; }
                const bv=numCol(ci);
                const n=Math.min(av.length,bv.length);
                const r=S.pearson(av.slice(0,n),bv.slice(0,n));
                if (r===null) { td.textContent='—'; td.style.color='#333'; return; }
                td.textContent=r.toFixed(2);
                const abs=Math.abs(r);
                td.style.background = r>0 ? `rgba(76,175,80,${abs*0.65+0.05})` : `rgba(229,115,115,${abs*0.65+0.05})`;
                td.style.color = abs>0.4 ? '#fff' : '#888';
            });
        });
        corrWrap.appendChild(ctbl);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  CHART ENGINE
    // ════════════════════════════════════════════════════════════════════════

    const CW=900, CH=400, CM={l:72,r:30,t:36,b:62};

    function chartBase(ctx) {
        ctx.fillStyle='#050505'; ctx.fillRect(0,0,CW,CH);
        ctx.fillStyle='#0b0b0b'; ctx.fillRect(CM.l,CM.t,CW-CM.l-CM.r,CH-CM.t-CM.b);
    }

    function drawYAxis(ctx, yMin, yMax, label) {
        const ph=CH-CM.t-CM.b;
        const ticks=niceTicks(yMin,yMax,6);
        ticks.forEach(v=>{
            const y=CM.t+(1-(v-yMin)/(yMax-yMin))*ph;
            if(y<CM.t-2||y>CM.t+ph+2) return;
            ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1;
            ctx.beginPath(); ctx.moveTo(CM.l,y); ctx.lineTo(CW-CM.r,y); ctx.stroke();
            ctx.fillStyle='#555'; ctx.font='10px Courier New'; ctx.textAlign='right';
            ctx.fillText(fmt(v),CM.l-6,y+3);
        });
        ctx.strokeStyle='#252525'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(CM.l,CM.t); ctx.lineTo(CM.l,CH-CM.b); ctx.stroke();
        if(label){ ctx.fillStyle='#f4a261'; ctx.font='11px Courier New';
            ctx.save(); ctx.translate(12,CM.t+(CH-CM.t-CM.b)/2); ctx.rotate(-Math.PI/2);
            ctx.textAlign='center'; ctx.fillText(label,0,0); ctx.restore(); }
    }

    function drawXAxisNums(ctx, xMin, xMax, label) {
        const pw=CW-CM.l-CM.r;
        const ticks=niceTicks(xMin,xMax,8);
        ticks.forEach(v=>{
            const x=CM.l+(v-xMin)/(xMax-xMin)*pw;
            if(x<CM.l-2||x>CM.l+pw+2) return;
            ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1;
            ctx.beginPath(); ctx.moveTo(x,CM.t); ctx.lineTo(x,CH-CM.b); ctx.stroke();
            ctx.fillStyle='#555'; ctx.font='10px Courier New'; ctx.textAlign='center';
            ctx.fillText(fmt(v),x,CH-CM.b+14);
        });
        ctx.strokeStyle='#252525'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(CM.l,CH-CM.b); ctx.lineTo(CW-CM.r,CH-CM.b); ctx.stroke();
        if(label){ ctx.fillStyle='#f4a261'; ctx.font='11px Courier New'; ctx.textAlign='center';
            ctx.fillText(label,CM.l+(CW-CM.l-CM.r)/2,CH-8); }
    }

    function drawXAxisCat(ctx, labels, label) {
        const pw=CW-CM.l-CM.r, n=labels.length;
        ctx.strokeStyle='#252525'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(CM.l,CH-CM.b); ctx.lineTo(CW-CM.r,CH-CM.b); ctx.stroke();
        labels.forEach((l,i)=>{
            const x=CM.l+(i+0.5)/n*pw;
            ctx.save(); ctx.translate(x, CH-CM.b+8);
            if(n>10) ctx.rotate(-0.6);
            ctx.fillStyle='#555'; ctx.font='9px Courier New'; ctx.textAlign=n>10?'right':'center';
            ctx.fillText(String(l).substring(0,12),0,0);
            ctx.restore();
        });
        if(label){ ctx.fillStyle='#f4a261'; ctx.font='11px Courier New'; ctx.textAlign='center';
            ctx.fillText(label,CM.l+pw/2,CH-6); }
    }

    function setChartType(type) {
        chartType=type;
        document.querySelectorAll('.chart-type-btn').forEach(b=>b.classList.toggle('active',b.dataset.type===type));
        const yLbl=document.getElementById('y-lbl');
        const ySel=document.getElementById('y-select');
        yLbl.style.display=type==='histogram'?'none':'';
        ySel.style.display=type==='histogram'?'none':'';
        drawChart();
    }

    function populateSelectors() {
        const xs=document.getElementById('x-select'), ys=document.getElementById('y-select');
        const xv=xs.value, yv=ys.value;
        xs.innerHTML=''; ys.innerHTML='';
        DS.headers.forEach((h,i)=>{
            xs.add(new Option(h,i));
            if(DS.types[i]==='numeric') ys.add(new Option(h,i));
        });
        if(xv) xs.value=xv;
        if(yv) ys.value=yv;
        else if(DS.types[parseInt(xs.value||0)]==='numeric') ys.value=xs.value;
        // prefer first numeric for y
        if(!ys.value||ys.value===xs.value){
            for(let i=0;i<DS.headers.length;i++){
                if(DS.types[i]==='numeric'&&String(i)!==String(xs.value)){ys.value=i;break;}
            }
        }
    }

    function drawChart() {
        const canvas=document.getElementById('chart-canvas');
        const ctx=canvas.getContext('2d');
        if(!DS.headers.length){ ctx.fillStyle='#050505'; ctx.fillRect(0,0,CW,CH); return; }

        const xi=parseInt(document.getElementById('x-select').value)||0;
        const yi=parseInt(document.getElementById('y-select').value)||0;
        const xLabel=DS.headers[xi], yLabel=DS.headers[yi];
        const xIsNum=DS.types[xi]==='numeric';

        if(chartType==='histogram'){
            const vals=numCol(xi); if(!vals.length) return;
            chartBase(ctx);
            const mn=S.min(vals),mx2=S.max(vals),n=Math.min(20,Math.ceil(1+3.32*Math.log10(vals.length)));
            const bw2=(mx2-mn)/n; const bins=Array(n).fill(0);
            vals.forEach(v=>{ const bi=Math.min(Math.floor((v-mn)/bw2),n-1); bins[bi]++; });
            const yMax2=Math.max(...bins)*1.1||1;
            drawYAxis(ctx,0,yMax2,'Count');
            drawXAxisNums(ctx,mn,mx2,xLabel);
            const pw=CW-CM.l-CM.r;
            bins.forEach((count,i)=>{
                const x1=CM.l+(i/n)*pw, x2=CM.l+((i+1)/n)*pw;
                const bh=count/yMax2*(CH-CM.t-CM.b);
                ctx.fillStyle=COLORS[i%COLORS.length]+'cc';
                ctx.fillRect(x1+1,CH-CM.b-bh,x2-x1-2,bh);
            });
            ctx.fillStyle='#f4a261'; ctx.font='12px Courier New'; ctx.textAlign='center';
            ctx.fillText('Histogram — '+xLabel,CW/2,22);
            return;
        }

        if(chartType==='pie'){
            const xVals=DS.rows.map(r=>r[xi]);
            const yVals=numCol(yi);
            chartBase(ctx);
            const cx=CW/2, cy=CH/2, r=Math.min(CW,CH)/2-50;
            const total=S.sum(yVals); let angle=-Math.PI/2;
            yVals.forEach((v,i)=>{
                const slice=(v/total)*Math.PI*2;
                ctx.beginPath(); ctx.moveTo(cx,cy);
                ctx.arc(cx,cy,r,angle,angle+slice); ctx.closePath();
                ctx.fillStyle=COLORS[i%COLORS.length];
                ctx.fill(); ctx.strokeStyle='#050505'; ctx.lineWidth=2; ctx.stroke();
                const mid=angle+slice/2, lx=cx+Math.cos(mid)*(r+18), ly=cy+Math.sin(mid)*(r+18);
                ctx.fillStyle='#888'; ctx.font='9px Courier New'; ctx.textAlign='center';
                ctx.fillText(String(xVals[i]).substring(0,10),lx,ly);
                angle+=slice;
            });
            ctx.fillStyle='#f4a261'; ctx.font='12px Courier New'; ctx.textAlign='center';
            ctx.fillText(yLabel+' by '+xLabel,CW/2,22);
            return;
        }

        if(chartType==='scatter'){
            const xVals=numCol(xi), yVals=numCol(yi);
            if(!xVals.length||!yVals.length) return;
            const n=Math.min(xVals.length,yVals.length);
            const xmn=S.min(xVals),xmx=S.max(xVals),ymn=S.min(yVals),ymx=S.max(yVals);
            const xpad=(xmx-xmn)*0.05||1, ypad=(ymx-ymn)*0.05||1;
            chartBase(ctx);
            drawYAxis(ctx,ymn-ypad,ymx+ypad,yLabel);
            drawXAxisNums(ctx,xmn-xpad,xmx+xpad,xLabel);
            const pw=CW-CM.l-CM.r, ph=CH-CM.t-CM.b;
            const px=v=>CM.l+(v-(xmn-xpad))/(xmx-xmn+xpad*2)*pw;
            const py=v=>CM.t+(1-(v-(ymn-ypad))/(ymx-ymn+ypad*2))*ph;
            for(let i=0;i<n;i++){
                ctx.beginPath(); ctx.arc(px(xVals[i]),py(yVals[i]),4,0,Math.PI*2);
                ctx.fillStyle=COLORS[i%COLORS.length]+'cc'; ctx.fill();
            }
            // trend line
            const reg=S.linreg(yVals.slice(0,n));
            const txs=xVals.slice(0,n);
            ctx.strokeStyle='rgba(244,162,97,0.5)'; ctx.lineWidth=1.5; ctx.setLineDash([5,4]);
            ctx.beginPath();
            for(let i=0;i<n;i++){
                const lx=px(txs[i]), ly=py(reg.slope*i+reg.intercept);
                if(i===0) ctx.moveTo(lx,ly); else ctx.lineTo(lx,ly);
            }
            ctx.stroke(); ctx.setLineDash([]);
            ctx.fillStyle='#f4a261'; ctx.font='12px Courier New'; ctx.textAlign='center';
            ctx.fillText(yLabel+' vs '+xLabel+' (r='+fmt(S.pearson(xVals.slice(0,n),yVals.slice(0,n))||0,2)+')',CW/2,22);
            return;
        }

        // Bar / Line — categorical or numeric x
        const xLabels = xIsNum ? numCol(xi) : DS.rows.map(r=>r[xi]);
        const yVals   = numCol(yi);
        if(!yVals.length) return;
        const n = Math.min(xLabels.length, yVals.length);
        const ymn=Math.min(0,...yVals.slice(0,n)), ymx=S.max(yVals.slice(0,n));
        const yRange=ymx-ymn||1;
        chartBase(ctx);
        drawYAxis(ctx, ymn-yRange*0.05, ymx+yRange*0.1, yLabel);
        if(xIsNum) drawXAxisNums(ctx, S.min(xLabels.slice(0,n)), S.max(xLabels.slice(0,n)), xLabel);
        else drawXAxisCat(ctx, xLabels.slice(0,n), xLabel);
        const pw=CW-CM.l-CM.r, ph=CH-CM.t-CM.b;
        const py2=v=>CM.t+(1-(v-(ymn-yRange*0.05))/((ymx+yRange*0.1)-(ymn-yRange*0.05)))*ph;
        const y0=py2(0);

        if(chartType==='bar'){
            const slot=pw/n, bw3=slot*0.65, gap=(slot-bw3)/2;
            yVals.slice(0,n).forEach((v,i)=>{
                const x=CM.l+i*slot+gap, yv=py2(v), bh=Math.abs(yv-y0);
                ctx.fillStyle=COLORS[i%COLORS.length]+'cc';
                ctx.fillRect(x, v>=0?yv:y0, bw3, bh||1);
                if(n<=20){
                    ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.font='8px Courier New'; ctx.textAlign='center';
                    ctx.fillText(fmt(v,1), x+bw3/2, v>=0?yv-4:y0+bh+10);
                }
            });
        } else { // line
            ctx.strokeStyle=COLORS[0]; ctx.lineWidth=2;
            ctx.beginPath();
            yVals.slice(0,n).forEach((v,i)=>{
                const x=CM.l+(i+0.5)/n*pw, y=py2(v);
                if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
            });
            ctx.stroke();
            yVals.slice(0,n).forEach((v,i)=>{
                const x=CM.l+(i+0.5)/n*pw, y=py2(v);
                ctx.beginPath(); ctx.arc(x,y,3.5,0,Math.PI*2);
                ctx.fillStyle=COLORS[0]; ctx.fill();
            });
            // Fill area
            ctx.beginPath();
            yVals.slice(0,n).forEach((v,i)=>{
                const x=CM.l+(i+0.5)/n*pw, y=py2(v);
                if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
            });
            ctx.lineTo(CM.l+(n-0.5)/n*pw,y0); ctx.lineTo(CM.l+0.5/n*pw,y0); ctx.closePath();
            ctx.fillStyle=COLORS[0]+'22'; ctx.fill();
        }

        ctx.fillStyle='#f4a261'; ctx.font='12px Courier New'; ctx.textAlign='center';
        ctx.fillText(yLabel+' by '+xLabel, CW/2, 22);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  INSIGHTS
    // ════════════════════════════════════════════════════════════════════════

    function renderInsights() {
        const hasData = DS.headers.length && DS.rows.length;
        document.getElementById('insights-empty').style.display   = hasData?'none':'';
        document.getElementById('insights-content').style.display = hasData?'':'none';
        if (!hasData) return;

        const div = document.getElementById('insights-content');
        div.innerHTML = '';

        const numCols = DS.headers.map((_,i)=>i).filter(i=>DS.types[i]==='numeric');

        // ── KPI Cards
        div.insertAdjacentHTML('beforeend','<div class="prism-section-title">Key Performance Indicators</div>');
        const kpiGrid = document.createElement('div'); kpiGrid.className='kpi-grid';
        numCols.slice(0,6).forEach(ci=>{
            const vals=numCol(ci); if(!vals.length) return;
            const card=document.createElement('div'); card.className='kpi-card';
            const reg=S.linreg(vals);
            const arrow=reg.slope>0.001?'↑':reg.slope<-0.001?'↓':'→';
            const arrowClass=reg.slope>0.001?'trend-up':reg.slope<-0.001?'trend-down':'trend-flat';
            card.innerHTML=`<div class="kpi-label">${DS.headers[ci]}</div>
<div class="kpi-value">${fmt(S.mean(vals))}</div>
<div class="kpi-sub">Mean &nbsp;|&nbsp; <span class="${arrowClass}">${arrow} ${Math.abs(reg.slope*vals.length/S.mean(vals)*100).toFixed(1)}% trend</span></div>`;
            kpiGrid.appendChild(card);
        });
        div.appendChild(kpiGrid);

        // ── Column Insights
        div.insertAdjacentHTML('beforeend','<div class="prism-section-title">Column Analysis</div>');
        numCols.forEach(ci=>{
            const vals=numCol(ci); if(!vals.length) return;
            const reg=S.linreg(vals);
            const cv=S.cv(vals);
            const sk=S.skew(vals);
            const trendTxt=reg.slope>0.001?`<span class="trend-up">↑ Upward</span>`:reg.slope<-0.001?`<span class="trend-down">↓ Downward</span>`:`<span class="trend-flat">→ Stable</span>`;
            const cvTxt=cv===null?'—':cv<15?'Low variability (stable, predictable)':cv<30?'Moderate variability':'High variability (volatile)';
            const skTxt=Math.abs(sk)<0.5?'Approximately symmetric':sk>0.5?'Right-skewed (outliers on high end)':'Left-skewed (outliers on low end)';
            const r2Pct=(reg.r2*100).toFixed(1);
            const block=document.createElement('div'); block.className='insight-block';
            block.innerHTML=`<div class="insight-title">${DS.headers[ci]}</div>
<div class="insight-body">
Trend: ${trendTxt} &nbsp;(R²=${r2Pct}%, next estimate: <strong>${fmt(reg.next)}</strong>)<br>
Variability: CV = ${cv!==null?cv.toFixed(1)+'%':'—'} — ${cvTxt}<br>
Distribution: ${skTxt} (skewness ${S.skew(vals).toFixed(2)})<br>
Range: ${fmt(S.min(vals))} → ${fmt(S.max(vals))} &nbsp;(IQR ${fmt(S.iqr(vals))})
</div>`;
            div.appendChild(block);
        });

        // ── Correlation Findings
        if(numCols.length>=2){
            div.insertAdjacentHTML('beforeend','<div class="prism-section-title">Correlation Findings</div>');
            const pairs=[];
            for(let i=0;i<numCols.length;i++) for(let j=i+1;j<numCols.length;j++){
                const a=numCol(numCols[i]),b=numCol(numCols[j]),n=Math.min(a.length,b.length);
                const r=S.pearson(a.slice(0,n),b.slice(0,n));
                if(r!==null) pairs.push({i:numCols[i],j:numCols[j],r});
            }
            pairs.sort((a,b)=>Math.abs(b.r)-Math.abs(a.r)).slice(0,5).forEach(p=>{
                const str=Math.abs(p.r)>=0.9?'Very strong':Math.abs(p.r)>=0.7?'Strong':Math.abs(p.r)>=0.5?'Moderate':Math.abs(p.r)>=0.3?'Weak':'Very weak';
                const dir=p.r>0?'positive':'negative';
                const biz=Math.abs(p.r)>=0.7?`This suggests <strong>${DS.headers[p.i]}</strong> may be a driver of <strong>${DS.headers[p.j]}</strong>.`:'Weak relationship — other factors likely dominate.';
                const block=document.createElement('div'); block.className='insight-block';
                block.innerHTML=`<div class="insight-title">${DS.headers[p.i]} ↔ ${DS.headers[p.j]}</div>
<div class="insight-body">${str} ${dir} correlation (r = ${p.r.toFixed(3)}). ${biz}</div>`;
                div.appendChild(block);
            });
        }

        // ── Statistical Glossary
        div.insertAdjacentHTML('beforeend','<div class="prism-section-title">Business Statistics Glossary</div>');
        const glossary=[
            ['Mean (Average)','The sum of all values divided by count. In business: average revenue, average order value, etc.'],
            ['Median','The middle value when sorted. Less sensitive to outliers than mean — useful for salary and price analysis.'],
            ['Standard Deviation','Measures how spread out values are from the mean. Higher = more volatile. Essential for risk assessment.'],
            ['Coefficient of Variation (CV)','Std Dev ÷ Mean, as a %. CV < 15% = stable; 15–30% = moderate risk; > 30% = high volatility.'],
            ['Skewness','Measures asymmetry. Positive = right tail (a few very high values pulling up). Negative = left tail.'],
            ['Kurtosis (Excess)','Measures tail heaviness. > 0 = heavy tails, more extreme outliers. < 0 = light tails, fewer extremes.'],
            ['IQR (Interquartile Range)','Distance between Q1 and Q3. Covers the middle 50% of data. Robust measure of spread.'],
            ['Pearson Correlation (r)','Measures linear relationship strength: ±1 = perfect, 0 = none. Does not imply causation.'],
            ['R² (R-squared)','% of variance explained by the trend line. R² > 0.7 = strong trend; < 0.3 = weak/no trend.'],
            ['Linear Regression','Fits a straight-line trend to data. Used for forecasting next-period values.'],
        ];
        const gg=document.createElement('div'); gg.className='glossary-grid';
        glossary.forEach(([term,def])=>{
            gg.insertAdjacentHTML('beforeend',`<div class="gloss-item"><div class="gloss-term">${term}</div><div class="gloss-def">${def}</div></div>`);
        });
        div.appendChild(gg);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  TABS
    // ════════════════════════════════════════════════════════════════════════

    function showTab(tab) {
        document.querySelectorAll('.mp-tab-panel').forEach(p=>p.style.display='none');
        document.querySelectorAll('.mp-tab').forEach(b=>b.classList.remove('active'));
        document.getElementById('tab-'+tab).style.display='';
        document.querySelector('.mp-tab[data-tab="'+tab+'"]').classList.add('active');
        if(tab==='stats')    renderStats();
        if(tab==='charts')   { populateSelectors(); const nc=DS.headers.length; document.getElementById('chart-empty').style.display=nc?'none':''; document.getElementById('chart-content').style.display=nc?'':'none'; if(nc) drawChart(); }
        if(tab==='insights') renderInsights();
    }

    // ════════════════════════════════════════════════════════════════════════
    //  CSV DROP ZONE
    // ════════════════════════════════════════════════════════════════════════

    (function(){
        const drop=document.getElementById('csv-drop');
        const fi=document.getElementById('csv-file');
        drop.addEventListener('click',()=>fi.click());
        drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('drag-over');});
        drop.addEventListener('dragleave',()=>drop.classList.remove('drag-over'));
        drop.addEventListener('drop',e=>{
            e.preventDefault(); drop.classList.remove('drag-over');
            const f=e.dataTransfer.files[0]; if(f) readFile(f);
        });
        fi.addEventListener('change',()=>{ if(fi.files[0]) readFile(fi.files[0]); });
        function readFile(f){
            const reader=new FileReader();
            reader.onload=e=>parseCSVText(e.target.result);
            reader.readAsText(f);
        }
    })();
