const CONFIG = window.DASHBOARD_CONFIG || {
  app:{title:'Cream Requirement & Tanker Planning Dashboard',version:'3.3',outputPrefix:'Cream_Tanker_Planning'},
  schedule:{lineIds:['A','B','C','D'],slotNumbers:[1,2,3,4,5,6],sharedLines:['A','B'],sharedSiteKey:'SITE-1',siteKeys:['SITE-1','SITE-2','SITE-3'],lineToSite:{A:'SITE-1',B:'SITE-1',C:'SITE-2',D:'SITE-3'},siteDisplay:{'SITE-1':'Shared Site 1','SITE-2':'Site 2','SITE-3':'Site 3'}},
  cream:{normalMaterialCodes:['MAT-CREAM-STD'],organicMaterialCodes:['MAT-CREAM-ORG'],normalDescriptionPatterns:['^STANDARD CREAM INGREDIENT\\s*$'],organicDescriptionPatterns:['^ORGANIC CREAM INGREDIENT\\b']},
  tanker:{standardLb:45000,organicLb:45000,leadHours:6,wastePct:1.5},
  receiving:{pointLabel:'Central Receiving',requiredByLabel:'Required at Central Receiving By'},
  inputAliases:{masterSheetExact:['item master'],masterSheetContains:['master'],bomSheetContains:['billdetail','bill'],ohSheetExact:['inventory'],ohSheetContains:['on hand'],scheduleFilePatterns:['production','schedule','week\s*\d+','wk\d+'],bomFilePatterns:['\bbom\b','bill'],ohFilePatterns:['on hand','inventory','\boh\b'],masterFilePatterns:['item master','master']},
  excludedCodes:['FC','BFT','CF','HWF','HWF-LFCPH','OCO','LCO','IC','CIP','BFC']
};
function cfgSiteForLine(line){return (CONFIG.schedule.lineToSite||{})[line]||line}
function cfgSiteLabel(site){return (CONFIG.schedule.siteDisplay||{})[site]||site}
function cfgReceivingPoint(){return (CONFIG.receiving&&CONFIG.receiving.pointLabel)||'Central Receiving'}
function cfgRequiredByLabel(){return (CONFIG.receiving&&CONFIG.receiving.requiredByLabel)||`Required at ${cfgReceivingPoint()} By`}
function cfgPatternMatch(text,patterns){return (patterns||[]).some(p=>{try{return new RegExp(p,'i').test(text)}catch(_){return false}})}
function cfgScheduleSheetName(slot,line){return `${slot}${line}`}
function cfgTextMatchesAny(text,patterns){return (patterns||[]).some(p=>{try{return new RegExp(p,'i').test(text)}catch(_){return String(text).toLowerCase().includes(String(p).toLowerCase())}})}
function cfgTextEqualsAny(text,values){const x=String(text||'').toLowerCase();return (values||[]).some(v=>x===String(v).toLowerCase())}
const S={
  scheduleWB:null, masterWB:null, bomWB:null, ohWB:null, scheduleName:'', masterName:'', bomName:'', ohName:'', demoMode:false,
  runs:[], issues:[], preflight:[], blocked:false, zeroCream:[], tankers:[], daily:[], dailyAudit:[], receiving:[], siteLedgers:{}, siteSummary:{},
  embeddedMaster:new Map(), externalMaster:new Map(), bomMap:new Map(), componentInfo:new Map(),
  excluded:new Set(CONFIG.excludedCodes||[])
};

const $=id=>document.getElementById(id);
const fmtLb=n=>Number.isFinite(n)?Math.round(n).toLocaleString()+' lb':'—';
const fmtNum=(n,d=2)=>Number.isFinite(n)?n.toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s??'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const codeNorm=s=>String(s??'').trim().toUpperCase();
const msHour=3600000;
const dayKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const shortDate=d=>d?`${d.getMonth()+1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`:'—';
const dt=d=>d?`${shortDate(d)} ${d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}`:'—';

[['breakStdTank',CONFIG.tanker.standardLb],['stdTank',CONFIG.tanker.standardLb],['orgTank',CONFIG.tanker.organicLb],['leadHours',CONFIG.tanker.leadHours],['wastePct',CONFIG.tanker.wastePct]].forEach(([id,v])=>{const el=$(id);if(el)el.value=String(v)});

function excelDate(v){
  if(v instanceof Date) return new Date(v.getFullYear(),v.getMonth(),v.getDate(),v.getHours(),v.getMinutes(),v.getSeconds());
  if(typeof v==='number' && Number.isFinite(v)){
    const p=XLSX.SSF.parse_date_code(v);
    if(!p) return null;
    return new Date(p.y,p.m-1,p.d,p.H||0,p.M||0,Math.floor(p.S||0));
  }
  if(typeof v==='string' && v.trim()){
    const d=new Date(v);
    if(!isNaN(d)) return d;
  }
  return null;
}
function num(v){
  if(typeof v==='number' && Number.isFinite(v)) return v;
  if(typeof v==='string'){
    const m=v.replace(/,/g,'').match(/-?\d+(?:\.\d+)?/);
    return m?Number(m[0]):NaN;
  }
  return NaN;
}
function creamTypeFromRawCream(raw){
  const txt=String(raw??'').trim().toUpperCase();
  if(/\(\s*ORGANIC\s*\)/.test(txt)) return 'Organic';
  return 'Standard';
}
function classifyCream(code, raw){
  const comps=S.bomMap.get(code)||[];
  let normalEvidence=null, organicEvidence=null;
  for(const comp of comps){
    const info=S.componentInfo.get(comp)||{};
    const desc=String(info.desc||'').trim();
    const u=desc.toUpperCase();
    if((CONFIG.cream.organicMaterialCodes||[]).includes(comp) || cfgPatternMatch(u,CONFIG.cream.organicDescriptionPatterns)){
      organicEvidence=`BOM ${comp}${desc?` — ${desc}`:''}`;
    }
    if((CONFIG.cream.normalMaterialCodes||[]).includes(comp) || cfgPatternMatch(u,CONFIG.cream.normalDescriptionPatterns)){
      normalEvidence=`BOM ${comp}${desc?` — ${desc}`:''}`;
    }
  }
  if(organicEvidence) return {type:'Organic',evidence:organicEvidence,method:'BOM + Inventory'};
  if(normalEvidence) return {type:'Standard',evidence:normalEvidence,method:'BOM + Inventory'};
  const fallback=creamTypeFromRawCream(raw);
  if(fallback==='Organic') return {type:'Organic',evidence:`Raw Cream cell: ${String(raw??'')}`,method:'Raw Cream fallback'};
  return {type:'Standard',evidence:`Raw Cream numeric/standard fallback`,method:'Fallback'};
}
function destForLine(line){return cfgSiteLabel(cfgSiteForLine(line));}
function siteForLine(line){return cfgSiteForLine(line);}
function tankerSize(type){
  return Number(type==='Organic'?$('orgTank').value:$('stdTank').value)||(type==='Organic'?CONFIG.tanker.organicLb:CONFIG.tanker.standardLb);
}
function leadHours(){const v=Number($('leadHours').value);return Number.isFinite(v)?v:Number(CONFIG.tanker.leadHours)||0}
function wasteFactor(){const v=Number($('wastePct').value);return 1+(Number.isFinite(v)?v:(Number(CONFIG.tanker.wastePct)||0))/100}

async function readWB(file){
  const ab=await file.arrayBuffer();
  return XLSX.read(ab,{type:'array',cellDates:false,cellFormula:true});
}

function findMasterMap(wb){
  const out=new Map();
  if(!wb) return out;
  let best=null;
  for(const sname of wb.SheetNames){
    const ws=wb.Sheets[sname];
    const rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null,blankrows:false});
    const lim=Math.min(rows.length,30);
    for(let r=0;r<lim;r++){
      const hdr=(rows[r]||[]).map(norm);
      let codeCol=-1, factorCol=-1, wasteCol=-1, descCol=-1, formulaCol=-1;
      hdr.forEach((h,i)=>{
        if(codeCol<0 && (h==='item code'||h==='code'||h==='item')) codeCol=i;
        if(factorCol<0 && (h.includes('cream')&&h.includes('case'))) factorCol=i;
        if(wasteCol<0 && h.includes('waste factor')) wasteCol=i;
        if(descCol<0 && (h==='desc'||h==='description')) descCol=i;
        if(formulaCol<0 && h.includes('formula')) formulaCol=i;
      });
      if(codeCol>=0 && factorCol>=0){
        const score=(sname.toLowerCase()==='data'?10:0)+(hdr[factorCol].includes('perfect raw cream')?8:0)+(wasteCol>=0?2:0);
        if(!best||score>best.score) best={sname,rows,headerRow:r,codeCol,factorCol,wasteCol,descCol,formulaCol,score};
      }
    }
  }
  if(!best) return out;
  for(let r=best.headerRow+1;r<best.rows.length;r++){
    const row=best.rows[r]||[];
    const code=codeNorm(row[best.codeCol]);
    if(!code) continue;
    const raw=row[best.factorCol];
    const factor=num(raw);
    const wf=best.wasteCol>=0?num(row[best.wasteCol]):NaN;
    out.set(code,{
      factor:Number.isFinite(factor)?factor:NaN,
      raw, waste:Number.isFinite(wf)?wf:NaN,
      desc:best.descCol>=0?row[best.descCol]:'',
      formula:best.formulaCol>=0?row[best.formulaCol]:'',
      source:best.sname
    });
  }
  return out;
}

function findBOMMap(wb){
  const out=new Map();
  if(!wb) return out;
  for(const sname of wb.SheetNames){
    const ws=wb.Sheets[sname];
    const rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null,blankrows:false});
    for(let r=0;r<Math.min(rows.length,20);r++){
      const hdr=(rows[r]||[]).map(norm);
      const billCol=hdr.findIndex(h=>h==='billno'||h==='bill no'||h==='bill number');
      const compCols=[];
      hdr.forEach((h,i)=>{if(h.includes('componentitemcode')||h==='component item code')compCols.push(i)});
      if(billCol<0||!compCols.length) continue;
      // The supplied BOM contains a formula/sub-bill component first and the actual ingredient component second.
      // Prefer the last ComponentItemCode column; this is the raw material code column in BM_BillDetail.
      const compCol=compCols[compCols.length-1];
      for(let i=r+1;i<rows.length;i++){
        const row=rows[i]||[];
        const bill=codeNorm(row[billCol]);
        const comp=codeNorm(row[compCol]);
        if(!bill||!comp) continue;
        if(!out.has(bill))out.set(bill,[]);
        if(!out.get(bill).includes(comp))out.get(bill).push(comp);
      }
      if(out.size) return out;
    }
  }
  return out;
}

function findComponentInfo(wb){
  const out=new Map();
  if(!wb) return out;
  for(const sname of wb.SheetNames){
    const ws=wb.Sheets[sname];
    const rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null,blankrows:false});
    for(let r=0;r<Math.min(rows.length,20);r++){
      const hdr=(rows[r]||[]).map(norm);
      const codeCol=hdr.findIndex(h=>h==='itemcode'||h==='item code');
      const descCol=hdr.findIndex(h=>h==='itemcodedesc'||h==='item code desc'||h==='description'||h==='item description');
      const ohCol=hdr.findIndex(h=>h.includes('totalquantityonhand')||h==='total quantity on hand');
      if(codeCol<0||descCol<0) continue;
      for(let i=r+1;i<rows.length;i++){
        const row=rows[i]||[];
        const code=codeNorm(row[codeCol]);
        if(!code) continue;
        out.set(code,{desc:row[descCol]??'',oh:ohCol>=0?num(row[ohCol]):NaN,source:sname});
      }
      if(out.size) return out;
    }
  }
  return out;
}

function rawDateTimeCheck(v){
  if(v===null||v===undefined||v==='') return {date:false,time:false,why:'blank'};
  if(typeof v==='number'&&Number.isFinite(v)){
    const av=Math.abs(v);
    const hasDate=av>=1;
    // Excel stores a valid midnight timestamp (12:00 AM) as an integer serial.
    // Numeric schedule cells therefore cannot use a non-zero fraction as a requirement for "time present".
    // Actual validity is confirmed below by parsing Start/Finish and requiring Finish > Start.
    return {date:hasDate,time:hasDate,why:hasDate?'ok (midnight allowed)':'time only'};
  }
  if(v instanceof Date){
    // 12:00 AM is a valid time and must not be rejected merely because h:m:s are all zero.
    return {date:true,time:true,why:'date object (midnight allowed)'};
  }
  const s=String(v).trim();
  const parsed=excelDate(v);
  if(!parsed) return {date:false,time:false,why:'invalid'};
  const hasDate=/\b\d{1,4}[\/\-]\d{1,2}[\/\-]\d{1,4}\b/.test(s)||/\b(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|SEPT|OCT|NOV|DEC)[A-Z]*\b/i.test(s);
  const hasTime=/\b\d{1,2}:\d{2}(?::\d{2})?\b/.test(s)||/\b(?:AM|PM)\b/i.test(s);
  return {date:hasDate,time:hasTime,why:!hasDate?'date missing':!hasTime?'time missing':'ok'};
}
function validateScheduleTiming(){
  const out=[];
  if(!S.scheduleWB) return out;
  const wb=S.scheduleWB;
  const validSheetNames=new Set((CONFIG.schedule.lineIds||[]).flatMap(line=>(CONFIG.schedule.slotNumbers||[]).map(slot=>cfgScheduleSheetName(slot,line).toUpperCase())));
  const sheets=wb.SheetNames.filter(x=>validSheetNames.has(String(x).toUpperCase())).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  if(!sheets.length){
    out.push({level:'error',msg:'No 1A–6D schedule sheets were found.'});
    return out;
  }
  for(const sname of sheets){
    const ws=wb.Sheets[sname];
    const rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null,blankrows:false});
    let hr=-1,cols={};
    for(let r=0;r<Math.min(rows.length,12);r++){
      const hdr=(rows[r]||[]).map(norm);
      const find=(...names)=>hdr.findIndex(h=>names.some(n=>h===n||h.includes(n)));
      const cCode=find('code'),cCases=find('cases'),cStart=find('start'),cFinish=find('finish');
      if(cCode>=0&&cCases>=0&&cStart>=0&&cFinish>=0){hr=r;cols={code:cCode,cases:cCases,start:cStart,finish:cFinish};break}
    }
    if(hr<0){
      out.push({level:'error',msg:`${sname}: Start / Finish / Code / Cases headers are not recognized. Update the schedule before analysis.`});
      continue;
    }
    for(let r=hr+1;r<rows.length;r++){
      const row=rows[r]||[];
      const code=codeNorm(row[cols.code]);
      const cases=num(row[cols.cases]);
      if(!code||!Number.isFinite(cases)||cases<=0) continue;
      if(S.excluded.has(code)) continue;
      const sc=rawDateTimeCheck(row[cols.start]);
      const fc=rawDateTimeCheck(row[cols.finish]);
      if(!sc.date||!sc.time){
        out.push({level:'error',msg:`${sname} row ${r+1} — ${code}: START must contain both date and time (${sc.why}).`});
      }
      if(!fc.date||!fc.time){
        out.push({level:'error',msg:`${sname} row ${r+1} — ${code}: FINISH must contain both date and time (${fc.why}).`});
      }
      const sd=excelDate(row[cols.start]),fd=excelDate(row[cols.finish]);
      if(sc.date&&sc.time&&fc.date&&fc.time&&sd&&fd&&fd<=sd){
        out.push({level:'error',msg:`${sname} row ${r+1} — ${code}: FINISH must be later than START.`});
      }
    }
  }
  return out;
}

function parseSchedule(){
  S.runs=[];S.issues=[];S.zeroCream=[];
  if(!S.scheduleWB) return;
  S.embeddedMaster=findMasterMap(S.scheduleWB);
  const wb=S.scheduleWB;
  const validSheetNames=new Set((CONFIG.schedule.lineIds||[]).flatMap(line=>(CONFIG.schedule.slotNumbers||[]).map(slot=>cfgScheduleSheetName(slot,line).toUpperCase())));
  const sheets=wb.SheetNames.filter(x=>validSheetNames.has(String(x).toUpperCase())).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  if(!sheets.length) S.issues.push({level:'error',msg:'No 1A–6D schedule sheets were found.'});
  for(const sname of sheets){
    const ws=wb.Sheets[sname];
    const rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null,blankrows:false});
    let hr=-1, cols={};
    for(let r=0;r<Math.min(rows.length,12);r++){
      const hdr=(rows[r]||[]).map(norm);
      const find=(...names)=>hdr.findIndex(h=>names.some(n=>h===n||h.includes(n)));
      const cCode=find('code'), cCases=find('cases'), cStart=find('start'), cFinish=find('finish');
      if(cCode>=0&&cCases>=0&&cStart>=0&&cFinish>=0){
        hr=r; cols={
          code:cCode,cases:cCases,start:cStart,finish:cFinish,
          desc:find('description','desc'),formula:find('formula'),
          cream:find('cream case','cream per case')
        };break;
      }
    }
    if(hr<0){S.issues.push({level:'warn',msg:`${sname}: schedule headers not recognized.`});continue}
    const line=sname.slice(-1).toUpperCase();
    for(let r=hr+1;r<rows.length;r++){
      const row=rows[r]||[];
      const code=codeNorm(row[cols.code]);
      const cases=num(row[cols.cases]);
      if(!code||!Number.isFinite(cases)||cases<=0) continue;
      if(S.excluded.has(code)) continue;
      const start=excelDate(row[cols.start]), finish=excelDate(row[cols.finish]);
      if(!start){S.issues.push({level:'error',msg:`${sname} ${code}: missing/invalid Start time.`});continue}
      const desc=cols.desc>=0?row[cols.desc]:'';
      const formula=cols.formula>=0?row[cols.formula]:'';
      const rowCream=cols.cream>=0?row[cols.cream]:null;
      const ext=S.externalMaster.get(code);
      const emb=S.embeddedMaster.get(code);
      const master=ext||emb||null;
      const factorRaw=master?master.raw:rowCream;
      const rawFactorText=String(factorRaw??'').trim().toUpperCase();
      const explicitNA=/^(N\/?A|NA|NOT APPLICABLE|NONE)$/.test(rawFactorText);
      let factor=master&&Number.isFinite(master.factor)?master.factor:num(rowCream);
      if(explicitNA) factor=0;
      if(!Number.isFinite(factor)){
        S.issues.push({level:'error',msg:`${sname} ${code}: MISSING CREAM FACTOR — requirement incomplete.`});
        S.runs.push({schedule:sname,line,code,desc,formula,cases,start,finish:finish||start,factor:NaN,cream:NaN,rawCreamValue:factorRaw,type:classifyCream(code,factorRaw).type,classificationEvidence:classifyCream(code,factorRaw).evidence,classificationMethod:classifyCream(code,factorRaw).method,dest:destForLine(line),source:ext?'External Master':emb?'Embedded Master':'Schedule'});
        continue;
      }
      if(explicitNA){
        S.zeroCream.push({schedule:sname,line,code,desc,reason:'Cream/Case explicitly N/A — treated as 0 raw cream.'});
      }
      let end=finish;
      const cream=factor*cases*wasteFactor();
      const classResult=classifyCream(code,factorRaw);
      S.runs.push({
        schedule:sname,line,code,desc,formula,cases,start,finish:end,factor,cream,
        rawCreamValue:factorRaw,
        type:classResult.type,classificationEvidence:classResult.evidence,classificationMethod:classResult.method,
        dest:destForLine(line),source:ext?'External Master':emb?'Embedded Master':'Schedule'
      });
    }
  }
  S.runs.sort((a,b)=>a.start-b.start||a.schedule.localeCompare(b.schedule));
}

function runSegments(run){
  if(!Number.isFinite(run.cream)||run.cream<=0) return [];
  const model=$('timingModel').value;
  const dur=run.finish-run.start;
  if(model==='start'||dur<=0) return [{start:run.start,end:run.start,lb:run.cream,rate:0,instant:true,run}];
  return [{start:run.start,end:run.finish,lb:run.cream,rate:run.cream/(dur/msHour),instant:false,run}];
}

function dailyCalc(){
  const map=new Map();
  function get(d){
    const k=dayKey(d);
    if(!map.has(k)) map.set(k,{
      date:new Date(d.getFullYear(),d.getMonth(),d.getDate()),
      A:0,B:0,C:0,D:0,Standard:0,Organic:0,total:0,
      AStandard:0,BStandard:0,CStandard:0,DStandard:0,
      AOrganic:0,BOrganic:0,COrganic:0,DOrganic:0
    });
    return map.get(k);
  }
  function add(x,run,lb){
    x[run.line]+=lb;
    x[run.type]+=lb;
    x[run.line+run.type]+=lb;
    x.total+=lb;
  }
  for(const run of S.runs){
    if(!Number.isFinite(run.cream)||run.cream<=0) continue;
    const seg=runSegments(run)[0];
    if(seg.instant){
      const x=get(run.start);add(x,run,run.cream);continue;
    }
    const totalMs=run.finish-run.start;
    let t=new Date(run.start);
    while(t<run.finish){
      const midnight=new Date(t.getFullYear(),t.getMonth(),t.getDate()+1,0,0,0);
      const e=new Date(Math.min(run.finish,midnight));
      const lb=run.cream*((e-t)/totalMs);
      const x=get(t);add(x,run,lb);
      t=e;
    }
  }
  S.daily=[...map.values()].sort((a,b)=>a.date-b.date);
}

function buildDailyAudit(){
  const rows=[];
  for(const run of S.runs){
    if(run.type!=='Standard'||!Number.isFinite(run.cream)||run.cream<=0) continue;
    if($('timingModel').value==='start'||run.finish<=run.start){
      rows.push({date:new Date(run.start.getFullYear(),run.start.getMonth(),run.start.getDate()),schedule:run.schedule,line:run.line,code:run.code,desc:run.desc||'',formula:run.formula||'',cases:run.cases,dailyCases:run.cases,start:run.start,finish:run.finish,segmentStart:run.start,segmentEnd:run.finish,factor:run.factor,itemCream:run.cream,dailyCream:run.cream,share:1});
      continue;
    }
    const dur=run.finish-run.start;
    let cur=new Date(run.start);
    while(cur<run.finish){
      const midnight=new Date(cur.getFullYear(),cur.getMonth(),cur.getDate()+1,0,0,0);
      const end=new Date(Math.min(run.finish,midnight));
      const share=(end-cur)/dur;
      rows.push({date:new Date(cur.getFullYear(),cur.getMonth(),cur.getDate()),schedule:run.schedule,line:run.line,code:run.code,desc:run.desc||'',formula:run.formula||'',cases:run.cases,dailyCases:run.cases*share,start:run.start,finish:run.finish,segmentStart:new Date(cur),segmentEnd:new Date(end),factor:run.factor,itemCream:run.cream,dailyCream:run.cream*share,share});
      cur=end;
    }
  }
  S.dailyAudit=rows.sort((a,b)=>a.date-b.date||a.segmentStart-b.segmentStart||a.schedule.localeCompare(b.schedule));
}

function thresholdTimes(runs,size){
  const valid=runs.filter(r=>Number.isFinite(r.cream)&&r.cream>0).sort((a,b)=>a.start-b.start);
  const total=valid.reduce((s,r)=>s+r.cream,0);
  if(!valid.length||total<=0) return {total:0,first:null,last:null,crossings:[]};
  if($('timingModel').value==='start'){
    let cum=0, crossings=[];
    const targets=[];
    for(let x=size;x<total-1e-7;x+=size) targets.push(x);
    let ti=0;
    for(const r of valid){
      const before=cum; cum+=r.cream;
      while(ti<targets.length && targets[ti]<=cum+1e-7){crossings.push(new Date(r.start));ti++}
    }
    return {total,first:new Date(valid[0].start),last:new Date(valid[valid.length-1].start),crossings};
  }
  const events=new Map();
  const add=(t,dr)=>{const k=+t;if(!events.has(k))events.set(k,0);events.set(k,events.get(k)+dr)};
  for(const r of valid){
    const dur=(r.finish-r.start)/msHour;
    if(dur<=0){continue}
    const rate=r.cream/dur;add(r.start,rate);add(r.finish,-rate);
  }
  const times=[...events.keys()].sort((a,b)=>a-b);
  const targets=[];for(let x=size;x<total-1e-7;x+=size)targets.push(x);
  let ti=0,cum=0,rate=0,crossings=[],first=null,last=null;
  for(let i=0;i<times.length;i++){
    const t=times[i];
    rate+=events.get(t);
    if(rate>1e-10 && !first) first=new Date(t);
    const next=times[i+1];
    if(next==null) break;
    const hrs=(next-t)/msHour;
    const demand=rate*hrs;
    while(ti<targets.length && targets[ti]<=cum+demand+1e-7 && rate>1e-10){
      const h=(targets[ti]-cum)/rate;
      crossings.push(new Date(t+h*msHour));ti++;
    }
    cum+=demand;
    if(rate>1e-10) last=new Date(next);
  }
  if(!first) first=new Date(valid[0].start);
  if(!last) last=new Date(valid[valid.length-1].finish||valid[valid.length-1].start);
  return {total,first,last,crossings};
}

function coverageDestinations(runs,start,end){
  const labels=[];
  for(const r of runs){
    if(r.finish>start && r.start<end){
      const lab=cfgSiteLabel(siteForLine(r.line));
      if(!labels.includes(lab)) labels.push(lab);
    }
  }
  return labels.join(' / ')||'—';
}
function activeStandardRunsAt(runs,t){
  const ms=+t;
  return runs.filter(r=>+r.start<=ms+1 && +r.finish>ms+1);
}
function activeStandardText(runs,t){
  const a=activeStandardRunsAt(runs,t);
  if(!a.length) return 'Site demand begins / resumes';
  return a.map(r=>`${r.code} | ${r.schedule} | ${r.line} Line`).join(' ; ');
}
function activeStandardRate(runs,t){
  return activeStandardRunsAt(runs,t).reduce((sum,r)=>{
    const hrs=(r.finish-r.start)/msHour;
    return sum+(hrs>0?r.cream/hrs:0);
  },0);
}
function continuousSitePlan(site,siteRuns,size){
  const valid=siteRuns.filter(r=>r&&r.start&&r.finish&&r.finish>r.start&&Number.isFinite(r.cream)&&r.cream>0)
    .sort((a,b)=>a.start-b.start||a.finish-b.finish||a.schedule.localeCompare(b.schedule)||a.code.localeCompare(b.code));
  const total=valid.reduce((sum,r)=>sum+r.cream,0);
  const empty={site,total:0,count:0,ending:0,tankers:[],ledger:[{time:null,timeEnd:null,event:'OPENING',activeText:'',change:0,balance:0,note:'Opening Normal Cream — current version assumes 0 lb'}],segments:[],first:null,last:null};
  if(!valid.length||total<=0||!(size>0)) return empty;

  // Build piecewise-linear combined site consumption. Rates are summed for every production line mapped to the same configured destination site.
  const events=new Map();
  const add=(t,delta)=>{const k=+t;events.set(k,(events.get(k)||0)+delta)};
  for(const r of valid){
    const hrs=(r.finish-r.start)/msHour;
    if(hrs<=0) continue;
    const rate=r.cream/hrs;
    add(r.start,rate);add(r.finish,-rate);
  }
  const times=[...events.keys()].sort((a,b)=>a-b);
  const segments=[];
  let rate=0,cum=0,first=null,last=null;
  for(let i=0;i<times.length;i++){
    const t=times[i];
    rate+=events.get(t)||0;
    const next=times[i+1];
    if(next==null) break;
    if(rate>1e-10 && next>t){
      const start=new Date(t),end=new Date(next);
      if(!first) first=new Date(start);
      const amount=rate*((next-t)/msHour);
      segments.push({start,end,rate,cumStart:cum,cumEnd:cum+amount});
      cum+=amount;last=new Date(end);
    }
  }
  if(!segments.length) return empty;

  // Whole tanker N is needed only when cumulative site use is about to exceed the capacity already delivered.
  // If a threshold is reached exactly when production pauses, defer the next tanker until consumption resumes.
  const count=Math.ceil((total-1e-8)/size);
  const needTimes=[new Date(segments[0].start)];
  for(let n=1;n<count;n++){
    const target=n*size;
    let when=null;
    for(let i=0;i<segments.length;i++){
      const sg=segments[i];
      if(target<sg.cumEnd-1e-7 && target>=sg.cumStart-1e-7){
        const hrs=(target-sg.cumStart)/sg.rate;
        when=new Date(+sg.start+hrs*msHour);break;
      }
      if(Math.abs(target-sg.cumEnd)<=1e-7){
        const nextSeg=segments[i+1];
        when=nextSeg?new Date(nextSeg.start):new Date(sg.end);break;
      }
    }
    if(!when) when=new Date(last);
    needTimes.push(when);
  }

  const tankers=needTimes.map((neededAtSite,i)=>{
    const active=activeStandardRunsAt(valid,neededAtSite);
    const activeText=active.length?active.map(r=>`${r.code} | ${r.schedule} | ${r.line} Line`).join(' ; '):'Site demand begins / resumes';
    const useRate=active.reduce((sum,r)=>{
      const hrs=(r.finish-r.start)/msHour;return sum+(hrs>0?r.cream/hrs:0);
    },0);
    return {
      dest:site,type:'Standard',no:0,siteNo:i+1,size,planned:size,
      neededAtSite:new Date(neededAtSite),trigger:new Date(neededAtSite),receive:new Date(+neededAtSite-leadHours()*msHour),
      coverageEnd:new Date(i+1<needTimes.length?needTimes[i+1]:last),coverageDestinations:site,
      activeText,siteUseRate:useRate,cumulativeUsed:i*size,
      balanceBeforeDelivery:0,balanceAfterDelivery:size
    };
  });

  // Build an auditable continuous site-balance ledger. Tankers are added at the site need time;
  // their configured receiving-point deadline is shown in the note by the configured lead time.
  const ledger=[{time:null,timeEnd:null,event:'OPENING',activeText:'',change:0,balance:0,note:'Opening Normal Cream — current version assumes 0 lb'}];
  const byNeed=new Map();
  for(const t of tankers){const k=+t.neededAtSite;if(!byNeed.has(k))byNeed.set(k,[]);byNeed.get(k).push(t)}
  let balance=0;
  const addTankersAt=(time)=>{
    for(const t of (byNeed.get(+time)||[])){
      const before=balance;balance+=size;
      t.balanceBeforeDelivery=before;t.balanceAfterDelivery=balance;
      ledger.push({time:new Date(time),timeEnd:null,event:'TANKER AVAILABLE',activeText:t.activeText,change:size,balance,
        note:`${cfgSiteLabel(site)}-${t.siteNo} • ${cfgRequiredByLabel()} ${dt(t.receive)} • whole ${fmtNum(size,0)} lb tanker`});
    }
  };
  for(const sg of segments){
    addTankersAt(sg.start);
    const internal=tankers.map(t=>t.neededAtSite).filter(t=>t>sg.start&&t<sg.end).sort((a,b)=>a-b);
    const points=[...internal,new Date(sg.end)];
    let cur=new Date(sg.start);
    for(const p of points){
      if(p>cur){
        const used=sg.rate*((p-cur)/msHour);
        balance-=used;if(Math.abs(balance)<1e-6)balance=0;
        const mid=new Date((+cur + +p)/2);
        ledger.push({time:new Date(cur),timeEnd:new Date(p),event:'CONTINUOUS USE',activeText:activeStandardText(valid,mid),change:-used,balance,
          note:`${fmtLb(sg.rate)}/hr combined ${site} Normal Cream use`});
      }
      cur=new Date(p);
      if(+p<+sg.end) addTankersAt(p);
    }
  }
  // Tanker needed exactly at the start of a later segment after a zero-demand gap is added by that segment's start.
  const ending=count*size-total;
  return {site,total,count,ending,tankers,ledger,segments,first,last};
}
function buildTankers(){
  S.tankers=[];S.siteLedgers={};S.siteSummary={};

  // NORMAL CREAM — continuous time-phased physical whole-tanker allocation by destination site.
  const size=tankerSize('Standard');
  const sites=[...(CONFIG.schedule.siteKeys||[])];
  const allRuns=S.runs.filter(r=>r.type==='Standard'&&Number.isFinite(r.cream)&&r.cream>0);
  const rawTankers=[];
  for(const site of sites){
    const siteRuns=allRuns.filter(r=>siteForLine(r.line)===site);
    const p=continuousSitePlan(site,siteRuns,size);
    S.siteLedgers[site]=p.ledger;
    S.siteSummary[site]={site,opening:0,demand:p.total,tankers:p.count,capacity:p.count*size,ending:p.ending};
    rawTankers.push(...p.tankers);
  }

  // Global tanker numbering follows earliest D-receiving deadline, which is the operational dispatch priority.
  rawTankers.sort((a,b)=>a.receive-b.receive||a.dest.localeCompare(b.dest)||a.siteNo-b.siteNo||a.trigger-b.trigger);
  rawTankers.forEach((t,i)=>t.no=i+1);
  S.tankers.push(...rawTankers);

  // Organic stays separate and keeps the prior requirement-timing model.
  const orgRuns=S.runs.filter(r=>r.type==='Organic'&&Number.isFinite(r.cream)&&r.cream>0);
  const orgSize=tankerSize('Organic');
  const tt=thresholdTimes(orgRuns,orgSize);
  if(tt.total){
    const count=Math.ceil(tt.total/orgSize-1e-12);
    const triggers=[tt.first,...tt.crossings];
    for(let i=0;i<count;i++){
      const trigger=triggers[i]||tt.last;
      const receive=new Date(trigger-leadHours()*msHour);
      const used=Math.min(orgSize,tt.total-i*orgSize);
      const coverageEnd=(i<tt.crossings.length?tt.crossings[i]:tt.last);
      S.tankers.push({dest:'D Organic Pool',type:'Organic',no:i+1,size:orgSize,planned:used,trigger,receive,coverageEnd,totalForGroup:tt.total,coverageDestinations:coverageDestinations(orgRuns,trigger,coverageEnd)});
    }
  }

  const rmap=new Map();
  for(const t of S.tankers){
    const k=dayKey(t.receive);
    if(!rmap.has(k)) rmap.set(k,{date:new Date(t.receive.getFullYear(),t.receive.getMonth(),t.receive.getDate()),Standard:0,Organic:0,total:0,rows:[]});
    const x=rmap.get(k);x[t.type]++;x.total++;x.rows.push(t);
  }
  S.receiving=[...rmap.values()].sort((a,b)=>a.date-b.date);
}
function recalc(){
  if(S.demoMode){
    for(const r of S.runs){if(Number.isFinite(r.factor)&&Number.isFinite(r.cases))r.cream=r.factor*r.cases*wasteFactor()}
    S.blocked=false;S.preflight=[];dailyCalc();buildDailyAudit();buildTankers();renderAll();return
  }
  if(!S.scheduleWB){S.blocked=false;S.preflight=[];renderAll();return}
  S.preflight=validateScheduleTiming();
  if(S.preflight.length){
    S.blocked=true;
    S.issues=[...S.preflight];
    S.runs=[];S.zeroCream=[];S.tankers=[];S.daily=[];S.receiving=[];
    renderAll();
    return;
  }
  S.blocked=false;
  parseSchedule();dailyCalc();buildDailyAudit();buildTankers();renderAll();
}

function scheduleStartMatrix(){
  const result=[];
  if(!S.scheduleWB) return result;
  for(const line of (CONFIG.schedule.lineIds||[])){
    const row={line,values:[]};
    for(const n of (CONFIG.schedule.slotNumbers||[])){
      const sname=cfgScheduleSheetName(n,line);
      const ws=S.scheduleWB.Sheets[sname];
      const raw=ws&&ws['S1']?ws['S1'].v:null;
      const d=excelDate(raw);
      row.values.push({schedule:sname,date:d,raw,valid:!!d && (typeof raw==='number'?raw>1:true)});
    }
    result.push(row);
  }
  return result;
}
function renderStartMatrix(){
  if(!S.scheduleWB){$('startMatrixWrap').innerHTML='<div class="empty">Upload the schedule to show 1A–6D Start Date/Time.</div>';return}
  const m=scheduleStartMatrix();
  let h='<table><thead><tr><th>Line / Schedule</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th></tr></thead><tbody>';
  for(const row of m){
    h+=`<tr><td>${row.line}</td>`;
    for(const x of row.values){
      h+=x.valid?`<td class="valid" title="${x.schedule}!S1">${dt(x.date)}</td>`:`<td class="missing" title="${x.schedule}!S1">MISSING DATE/TIME</td>`;
    }
    h+='</tr>';
  }
  h+='</tbody></table>';
  $('startMatrixWrap').innerHTML=h;
}
function dailyTankerRequirements(){
  const size=tankerSize('Standard');
  let cum=0,prevLoads=0;
  const map=new Map();
  for(const x of S.daily.filter(x=>x.Standard>0.0001).sort((a,b)=>a.date-b.date)){
    cum+=x.Standard;
    const loads=Math.ceil((cum-1e-8)/size);
    map.set(dayKey(x.date),Math.max(0,loads-prevLoads));
    prevLoads=loads;
  }
  return map;
}
function timeOnly(d){
  if(!(d instanceof Date)||isNaN(d)) return '—';
  return d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
}
function renderCreamCallout(){
  if(!S.dailyAudit.length){$('creamCalloutWrap').innerHTML='<div class="empty">No Normal Cream callout rows.</div>';return}
  const groups=new Map(),tk=dailyTankerRequirements();
  for(const r of S.dailyAudit){
    const k=dayKey(r.date);
    if(!groups.has(k))groups.set(k,{date:r.date,total:0,lines:{A:[],B:[],C:[],D:[]},lineTotals:{A:0,B:0,C:0,D:0}});
    const g=groups.get(k);g.total+=r.dailyCream;g.lines[r.line].push(r);g.lineTotals[r.line]+=r.dailyCream;
  }
  let h='';
  for(const [k,g] of [...groups.entries()].sort((a,b)=>a[1].date-b[1].date)){
    h+=`<div class="calloutday"><div class="calloutdayhead"><div class="calloutdate">${shortDate(g.date)}</div><div class="callouttotals"><b>${fmtLb(g.total)}</b> Normal Cream<br>${tk.get(k)||0} volume-equivalent tanker(s) • physical destination plan is on Page 2</div></div>`;
    for(const line of (CONFIG.schedule.lineIds||[])){
      const rows=g.lines[line]; if(!rows.length) continue;
      h+=`<div class="calloutline"><div class="calloutlinehead"><span>${line} LINE</span><span>${fmtLb(g.lineTotals[line])}</span></div>`;
      for(const r of rows){
        h+=`<div class="calloutrow"><b>${esc(r.code)}</b> &nbsp;|&nbsp; ${esc(r.schedule)} &nbsp;|&nbsp; ${timeOnly(r.segmentStart)} → ${timeOnly(r.segmentEnd)} &nbsp;|&nbsp; ${fmtNum(r.dailyCases,0)} Cases <b>(${fmtLb(r.dailyCream)} Cream)</b></div>`;
      }
      h+='</div>';
    }
    h+='</div>';
  }
  $('creamCalloutWrap').innerHTML=h;
}


function renderBreakdownDetailTable(){
  const wrap=$('breakCalloutWrap');
  if(!wrap) return;
  if(!S.scheduleWB){wrap.innerHTML='<div class="empty">Upload the schedule to build the line-by-line run table.</div>';return;}
  if(S.blocked){wrap.innerHTML='<div class="empty">Run breakdown is blocked until active production timing is complete.</div>';return;}
  if(!S.dailyAudit.length){wrap.innerHTML='<div class="empty">No Normal Cream run breakdown rows.</div>';return;}

  const groups=new Map();
  for(const r of S.dailyAudit){
    const k=dayKey(r.date);
    if(!groups.has(k)) groups.set(k,{date:r.date,lines:{A:[],B:[],C:[],D:[]},lineTotals:{A:0,B:0,C:0,D:0}});
    const g=groups.get(k);
    if(g.lines[r.line]){g.lines[r.line].push(r);g.lineTotals[r.line]+=r.dailyCream;}
  }
  for(const g of groups.values()) for(const line of ['A','B','C','D']) g.lines[line].sort((a,b)=>a.segmentStart-b.segmentStart||a.schedule.localeCompare(b.schedule));

  const tk=dailyTankerRequirements();
  const sortedGroups=[...groups.values()].sort((a,b)=>a.date-b.date);
  let grandCream=0;
  let h='<table class="runbreaktable"><thead><tr><th>Date</th><th class="tankerHead">Tankers Required</th><th class="creamTotalHead">Total Normal Cream</th><th class="lineAHead">A Line — Run Breakdown</th><th class="lineBHead">B Line — Run Breakdown</th><th class="lineCHead">C Line — Run Breakdown</th><th class="lineDHead">D Line — Run Breakdown</th></tr></thead><tbody>';
  for(const g of sortedGroups){
    const k=dayKey(g.date);
    const total=['A','B','C','D'].reduce((sum,line)=>sum+g.lineTotals[line],0);
    grandCream+=total;
    h+=`<tr><td>${shortDate(g.date)}</td><td class="runbreaktankers">${tk.get(k)||0}</td><td class="runbreakcreamtotal">${fmtLb(total)}</td>`;
    for(const line of (CONFIG.schedule.lineIds||[])){
      const rows=g.lines[line];
      h+='<td class="runbreakcell">';
      h+=`<div class="runbreaktotal">${line} Line Total: ${fmtLb(g.lineTotals[line])}</div>`;
      if(!rows.length){h+='<div class="runempty">No Normal Cream run</div>';} else {
        for(const r of rows){
          const cls=line==='A'?'':` line${line}`;
          h+=`<div class="runentry${cls}"><span class="item">${esc(r.code)}</span> &nbsp;|&nbsp; ${esc(r.schedule)} &nbsp;|&nbsp; ${timeOnly(r.segmentStart)}–${timeOnly(r.segmentEnd)} &nbsp;|&nbsp; <span class="cases">${fmtNum(r.dailyCases,0)} Cases</span> <span class="cream">(${fmtNum(r.dailyCream,0)} lb Cream)</span></div>`;
        }
      }
      h+='</td>';
    }
    h+='</tr>';
  }
  const grandTankers=[...tk.values()].reduce((sum,v)=>sum+(Number(v)||0),0);
  h+=`<tr class="runbreakgrandtotal"><td>TOTAL</td><td>${grandTankers}</td><td>${fmtLb(grandCream)}</td><td colspan="4" class="runbreakgrandlabel">END OF SCHEDULE — TOTAL TANKERS & NORMAL CREAM</td></tr>`;
  h+='</tbody></table>';
  wrap.innerHTML=h;
}

function renderBreakdownPage(){
  const loaded=!!S.scheduleWB;
  if($('breakScheduleFile')) $('breakScheduleFile').textContent=loaded?(S.scheduleName||'Schedule loaded'):'No schedule loaded';
  if($('breakStdTank') && document.activeElement!==$('breakStdTank')) $('breakStdTank').value=$('stdTank').value;
  if($('breakStartMatrixWrap') && $('startMatrixWrap')) $('breakStartMatrixWrap').innerHTML=$('startMatrixWrap').innerHTML;
  if($('breakDailyWrap') && $('dailyWrap')) $('breakDailyWrap').innerHTML=$('dailyWrap').innerHTML;
  renderBreakdownDetailTable();
  if($('breakDownloadBtn')) $('breakDownloadBtn').disabled=!loaded||S.blocked;
  if($('breakClearScheduleBtn')) $('breakClearScheduleBtn').disabled=!loaded;
  const errCount=S.issues.filter(x=>x.level==='error').length;
  const warnCount=S.issues.filter(x=>x.level==='warn').length;
  if($('breakStatusDot')) $('breakStatusDot').className='dot '+(!loaded?'':S.blocked?'err':errCount?'err':warnCount?'warn':'ok');
  if($('breakStatusText')) $('breakStatusText').textContent=!loaded?'Waiting for schedule':S.blocked?`BLOCKED — ${S.preflight.length} active schedule timing issue(s)`:errCount?`Loaded with ${errCount} error(s)`:warnCount?`Loaded with ${warnCount} warning(s)`:`Ready — ${S.runs.length} production rows`;
  if($('breakPreflightWrap')) $('breakPreflightWrap').classList.toggle('show',loaded&&S.blocked);
  if($('breakPreflightList')) $('breakPreflightList').innerHTML=S.preflight.slice(0,30).map(i=>`<li>${esc(i.msg)}</li>`).join('')+(S.preflight.length>30?`<li>...and ${S.preflight.length-30} more.</li>`:'');
  if(!loaded || S.blocked){
    if($('breakTotal')) $('breakTotal').textContent=loaded?'BLOCKED':'—';
    if($('breakTankers')) $('breakTankers').textContent=loaded?'BLOCKED':'—';
    if($('breakStart')) $('breakStart').textContent=loaded?'BLOCKED':'—';
    if($('breakTankersSub')) $('breakTankersSub').textContent=`${fmtNum(tankerSize('Standard'),0)}-lb volume-equivalent quick view`;
    return;
  }
  const good=S.runs.filter(r=>Number.isFinite(r.cream));
  const normal=good.filter(r=>r.type==='Standard').reduce((sum,r)=>sum+r.cream,0);
  const tankers=Math.ceil((normal-1e-8)/tankerSize('Standard'));
  const starts=good.map(r=>r.start).filter(Boolean).sort((a,b)=>a-b);
  if($('breakTotal')) $('breakTotal').textContent=fmtLb(normal);
  if($('breakTankers')) $('breakTankers').textContent=tankers.toLocaleString();
  if($('breakTankersSub')) $('breakTankersSub').textContent=`${fmtNum(tankerSize('Standard'),0)}-lb volume-equivalent quick view`;
  if($('breakStart')) $('breakStart').textContent=starts.length?dt(starts[0]):'—';
}

function renderAll(){
  const loaded=!!S.scheduleWB;
  renderStartMatrix();
  $('downloadPlanErrorsBtn').disabled=!loaded;
  $('downloadCreamBreakdownBtn').disabled=!loaded||S.blocked;
  const errCount=S.issues.filter(x=>x.level==='error').length;
  const warnCount=S.issues.filter(x=>x.level==='warn').length;
  $('statusDot').className='dot '+(!loaded?'':S.blocked?'err':errCount?'err':warnCount?'warn':'ok');
  $('statusText').textContent=!loaded?'Waiting for schedule':S.blocked?`BLOCKED — ${S.preflight.length} schedule date/time issue(s). Update schedule before analysis.`:errCount?`Loaded with ${errCount} error(s)`:warnCount?`Loaded with ${warnCount} warning(s)`:`Ready — ${S.runs.length} production rows${S.zeroCream.length?` • ${S.zeroCream.length} N/A cream row(s) = 0`:''}`;
  $('preflightWrap').classList.toggle('show',loaded&&S.blocked);
  $('preflightList').innerHTML=S.preflight.slice(0,30).map(i=>`<li>${esc(i.msg)}</li>`).join('')+(S.preflight.length>30?`<li>...and ${S.preflight.length-30} more.</li>`:'');
  renderCodes();
  if(!loaded){
    ['kTotal','kStd','kOrg','kStart','kReceipt'].forEach(id=>$(id).textContent='—');
    $('dailyWrap').innerHTML='<div class="empty">Upload the schedule to calculate daily cream.</div>';$('dailyAuditWrap').innerHTML='<div class="empty">Daily schedule breakdown will appear here.</div>';$('creamCalloutWrap').innerHTML='<div class="empty">Upload the schedule to build the Cream Usage Callout.</div>';
    $('receivingWrap').innerHTML='<div class="empty">Tanker receiving dates will appear here.</div>';
    $('tankerWrap').innerHTML='<div class="empty">Upload the schedule to build the physical tanker dispatch plan.</div>';if($('siteLedgerWrap'))$('siteLedgerWrap').innerHTML='<div class="empty">Upload the schedule to build the site balance ledger.</div>';
    $('detailWrap').innerHTML='<div class="empty">Scheduled items will appear here.</div>';
    $('issueWrap').innerHTML='<div class="empty">No schedule loaded.</div>';
    $('siteCards').innerHTML='';$('dayCards').innerHTML='<div class="empty">Daily tanker cards will appear here.</div>';clearGraphCards('Upload the schedule to calculate graphs.');$('organicDailyWrap').innerHTML='<div class="empty">Upload the schedule to calculate Organic Cream.</div>';$('organicReceivingWrap').innerHTML='<div class="empty">Organic tanker deadlines will appear here.</div>';$('organicDetailWrap').innerHTML='<div class="empty">Organic scheduled items will appear here.</div>';renderBreakdownPage();return;
  }
  if(S.blocked){
    ['kTotal','kStd','kOrg','kStart','kReceipt'].forEach(id=>$(id).textContent='BLOCKED');
    $('dailyWrap').innerHTML='<div class="empty">Analysis is blocked until every scheduled row has both date and time.</div>';$('dailyAuditWrap').innerHTML='<div class="empty">Daily audit is blocked until schedule timing is complete.</div>';$('creamCalloutWrap').innerHTML='<div class="empty">Callout is blocked until active production timing is complete.</div>';
    $('receivingWrap').innerHTML='<div class="empty">No tanker plan is generated while schedule timing is incomplete.</div>';
    $('tankerWrap').innerHTML='<div class="empty">No tanker plan is generated while schedule timing is incomplete.</div>';if($('siteLedgerWrap'))$('siteLedgerWrap').innerHTML='<div class="empty">Site balance ledger is blocked until schedule timing is complete.</div>';
    $('dayCards').innerHTML='<div class="empty">Update the flagged schedule dates/times and re-upload.</div>';
    clearGraphCards('Graphs not generated — schedule timing must be complete first.');
    $('siteCards').innerHTML='';
    $('organicDailyWrap').innerHTML='<div class="empty">Blocked until schedule timing is complete.</div>';
    $('organicReceivingWrap').innerHTML='<div class="empty">Blocked until schedule timing is complete.</div>';
    $('organicDetailWrap').innerHTML='<div class="empty">Blocked until schedule timing is complete.</div>';
    $('detailWrap').innerHTML='<div class="empty">Blocked until schedule timing is complete.</div>';
    renderIssues();
    renderBreakdownPage();
    return;
  }
  const good=S.runs.filter(r=>Number.isFinite(r.cream));
  const byType=t=>good.filter(r=>r.type===t).reduce((s,r)=>s+r.cream,0);
  const countType=t=>S.tankers.filter(x=>x.type===t).length;
  const normal=byType('Standard');
  $('kTotal').textContent=fmtLb(normal);$('kTotalSub').textContent=`Organic is NOT included`;
  $('kStd').textContent=countType('Standard').toLocaleString();$('kStdSub').textContent=`whole ${fmtNum(tankerSize('Standard'),0)}-lb loads • assigned by configured destination site`;
  $('kOrg').textContent=fmtLb(byType('Organic'));$('kOrgSub').textContent=`Separate page • ${countType('Organic')} tanker(s)`;
  const starts=good.map(r=>r.start).sort((a,b)=>a-b);
  $('kStart').textContent=starts.length?dt(starts[0]):'—';
  const normalTankers=S.tankers.filter(t=>t.type==='Standard').sort((a,b)=>a.receive-b.receive);
  $('kReceipt').textContent=normalTankers.length?dt(normalTankers[0].receive):'—';
  renderDayCards();renderGraphs();renderDaily();renderDailyAudit();renderCreamCallout();renderReceiving();renderTankers();renderSiteLedger();renderOrganic();renderDetail();renderIssues();
  renderBreakdownPage();
}

function mixBar(x){
  const t=x.total||1;
  return `<div class="bar" title="Standard ${fmtLb(x.Standard)} • Organic ${fmtLb(x.Organic)} • Oat ${fmtLb(x.Oat)}"><span class="std" style="width:${100*x.Standard/t}%"></span><span class="org" style="width:${100*x.Organic/t}%"></span><span class="oat" style="width:${100*x.Oat/t}%"></span></div>`;
}
function normalTankers(){return S.tankers.filter(t=>t.type==='Standard').sort((a,b)=>a.receive-b.receive)}
function renderDayCards(){
  const runs=S.runs.filter(r=>r.type==='Standard'&&Number.isFinite(r.cream)&&r.cream>0);
  if(!runs.length){$('dayCards').innerHTML='<div class="empty">No Normal Cream demand.</div>';return}
  const tks=normalTankers();
  const startMs=Math.min(...runs.map(r=>+r.start),...(tks.length?tks.map(t=>+t.receive):runs.map(r=>+r.start)));
  const endMs=Math.max(...runs.map(r=>+r.finish));
  let d=new Date(startMs);d=new Date(d.getFullYear(),d.getMonth(),d.getDate());
  const endD=new Date(new Date(endMs).getFullYear(),new Date(endMs).getMonth(),new Date(endMs).getDate());
  const dailyMap=new Map(S.daily.map(x=>[dayKey(x.date),x]));
  let h='';
  while(d<=endD){
    const k=dayKey(d),x=dailyMap.get(k);
    const loads=tks.filter(t=>dayKey(t.receive)===k).sort((a,b)=>a.receive-b.receive);
    const times=loads.map(t=>`T${t.no}→${esc(cfgSiteLabel(t.dest))} ${t.receive.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}`).join('<br>');
    h+=`<div class="daycard"><div class="date">${shortDate(d)}</div><div class="use">${fmtLb(x?x.Standard:0)}</div><div class="loads">${loads.length} whole tanker${loads.length===1?'':'s'} due at D receiving</div><div class="times">${times||`No tanker due at ${cfgReceivingPoint()}`}</div></div>`;
    d=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1);
  }
  $('dayCards').innerHTML=h;
}function cumulativeAt(runs,t){
  let s=0;
  for(const r of runs){
    if(t<=r.start) continue;
    if(t>=r.finish){s+=r.cream;continue}
    const dur=r.finish-r.start;
    if(dur<=0){s+=r.cream;continue}
    s+=r.cream*((t-r.start)/dur);
  }
  return s;
}
function clearGraphCards(msg){
  ['cumulative','daily','line','tankers','dailycap','buffer'].forEach(k=>{
    const el=$('graph-'+k);if(el)el.innerHTML=`<div class="empty">${esc(msg)}</div>`;
  });
}
function graphVisibility(){
  const val=$('graphSelect')?.value||'all';
  document.querySelectorAll('[data-graph]').forEach(el=>{
    el.classList.toggle('hidden',val!=='all'&&el.dataset.graph!==val);
  });
}
function graphBase(title,note,W=1400,H=330){
  return {W,H,L:72,R:24,T:45,B:52,title,note};
}
function graphGrid(cfg,ymax,yFormatter=(v)=>Math.round(v/1000)+'k'){
  const {W,H,L,R,T,B}=cfg;
  const innerH=H-T-B;
  let s='';
  for(let i=0;i<=4;i++){
    const v=ymax*i/4,yy=T+innerH-(v/ymax)*innerH;
    s+=`<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" stroke="currentColor" opacity=".10"/>`;
    s+=`<text x="${L-8}" y="${yy+4}" text-anchor="end" font-size="10" fill="currentColor" opacity=".65">${yFormatter(v)}</text>`;
  }
  return s;
}
function dateTicks(cfg,dates,x){
  const {H,B}=cfg;let s='';
  dates.forEach((d,i)=>{
    const xx=x(i);
    s+=`<text x="${xx}" y="${H-B+20}" text-anchor="middle" font-size="10" fill="currentColor" opacity=".75">${shortDate(d)}</text>`;
  });
  return s;
}
function wrapGraph(title,note,legend,svg){
  return `<h4>${esc(title)}</h4><div class="graphnote">${esc(note)}</div>${legend?`<div class="graphkey">${legend}</div>`:''}${svg}`;
}
function renderGraphs(){
  const runs=S.runs.filter(r=>r.type==='Standard'&&Number.isFinite(r.cream)&&r.cream>0);
  if(!runs.length){clearGraphCards('No Normal Cream demand.');graphVisibility();return}
  renderCumulativeGraph(runs);
  renderDailyUsageGraph();
  renderDailyLineGraph();
  renderTankerDayGraph();
  renderDailyCapacityGraph();
  renderBufferGraph(runs);
  graphVisibility();
}
function renderCumulativeGraph(runs){
  const tks=normalTankers();
  const firstProd=new Date(Math.min(...runs.map(r=>+r.start)));
  const lastProd=new Date(Math.max(...runs.map(r=>+r.finish)));
  const firstReceipt=tks.length?new Date(Math.min(...tks.map(t=>+t.receive))):firstProd;
  const domainStart=new Date(Math.min(+firstProd,+firstReceipt));
  const domainEnd=lastProd;
  const cfg=graphBase(`Cumulative Cream vs Tanker Capacity — ${cfgReceivingPoint()}`,`Whole-schedule aggregate view: cumulative Normal Cream consumption versus whole-tanker capacity required at ${cfgReceivingPoint()} for assignment to configured destination sites. Site balances remain non-transferable.`);
  const {W,H,L,R,T,B}=cfg,innerW=W-L-R,innerH=H-T-B;
  const total=runs.reduce((s,r)=>s+r.cream,0);
  const maxCap=tks.length*tankerSize('Standard');
  const ymax=Math.max(total,maxCap)*1.04||1;
  const x=t=>L+((+t-+domainStart)/(+domainEnd-+domainStart||1))*innerW;
  const y=v=>T+innerH-(v/ymax)*innerH;
  let svg=`<svg viewBox="0 0 ${W} ${H}">`;
  svg+=graphGrid(cfg,ymax);
  let day=new Date(domainStart.getFullYear(),domainStart.getMonth(),domainStart.getDate());
  if(day<domainStart)day=new Date(day.getFullYear(),day.getMonth(),day.getDate()+1);
  while(day<domainEnd){
    const xx=x(day);
    svg+=`<line x1="${xx}" y1="${T}" x2="${xx}" y2="${H-B}" stroke="currentColor" opacity=".13" stroke-dasharray="4 4"/>`;
    svg+=`<text x="${xx+4}" y="${H-B+18}" font-size="10" fill="currentColor" opacity=".75">${shortDate(day)}</text>`;
    day=new Date(day.getFullYear(),day.getMonth(),day.getDate()+1);
  }
  const sampleTimes=new Set([+domainStart,+domainEnd]);
  for(const r of runs){sampleTimes.add(+r.start);sampleTimes.add(+r.finish)}
  for(const t of tks){sampleTimes.add(+t.receive);sampleTimes.add(+t.trigger);sampleTimes.add(+t.coverageEnd)}
  for(let ms=+domainStart;ms<=+domainEnd;ms+=2*msHour)sampleTimes.add(ms);
  const pts=[...sampleTimes].filter(ms=>ms>=+domainStart&&ms<=+domainEnd).sort((a,b)=>a-b);
  let usedPath='';
  pts.forEach((ms,i)=>{
    const xx=x(new Date(ms)),yy=y(cumulativeAt(runs,new Date(ms)));
    usedPath+=(i?' L ':'M ')+xx.toFixed(1)+' '+yy.toFixed(1);
  });
  svg+=`<path d="${usedPath}" fill="none" stroke="#24577d" stroke-width="3"/>`;
  let cap=0,capPath=`M ${x(domainStart).toFixed(1)} ${y(0).toFixed(1)}`;
  for(const tk of tks){
    const xx=x(tk.receive);
    capPath+=` L ${xx.toFixed(1)} ${y(cap).toFixed(1)} L ${xx.toFixed(1)} ${y(cap+tk.size).toFixed(1)}`;
    cap+=tk.size;
  }
  capPath+=` L ${x(domainEnd).toFixed(1)} ${y(cap).toFixed(1)}`;
  svg+=`<path d="${capPath}" fill="none" stroke="#198754" stroke-width="2.5" stroke-dasharray="7 4"/>`;
  for(const tk of tks){
    const xx=x(tk.receive),cy=y(Math.min(tk.no*tk.size,ymax));
    svg+=`<circle cx="${xx}" cy="${cy}" r="4" fill="#b7791f"><title>T${tk.no}: ${dt(tk.receive)}</title></circle>`;
  }
  svg+='</svg>';
  const legend=`<span><i style="background:#24577d"></i>Cumulative cream used</span><span><i style="background:#198754"></i>Cumulative tanker capacity required at ${esc(cfgReceivingPoint())}</span><span><i style="background:#b7791f;border-radius:50%"></i>${esc(cfgReceivingPoint())} deadline</span>`;
  $('graph-cumulative').innerHTML=wrapGraph(cfg.title,cfg.note,legend,svg);
}
function dailyProductionRows(){
  return S.daily.filter(x=>x.Standard>0.0001).sort((a,b)=>a.date-b.date);
}
function renderDailyUsageGraph(){
  const rows=dailyProductionRows(),cfg=graphBase('Daily Normal Cream Usage','How many pounds of Normal Cream are consumed on each production day.');
  if(!rows.length){$('graph-daily').innerHTML='<div class="empty">No daily Normal Cream usage.</div>';return}
  const {W,H,L,R,T,B}=cfg,innerW=W-L-R,innerH=H-T-B;
  const ymax=Math.max(...rows.map(x=>x.Standard))*1.12||1;
  const band=innerW/rows.length,barW=Math.min(68,band*.66);
  const x=i=>L+band*(i+.5),y=v=>T+innerH-(v/ymax)*innerH;
  let svg=`<svg viewBox="0 0 ${W} ${H}">${graphGrid(cfg,ymax)}`;
  rows.forEach((r,i)=>{
    const xx=x(i)-barW/2,yy=y(r.Standard),hh=T+innerH-yy;
    svg+=`<rect x="${xx}" y="${yy}" width="${barW}" height="${hh}" rx="3" fill="#24577d"><title>${shortDate(r.date)}: ${fmtLb(r.Standard)}</title></rect>`;
    svg+=`<text x="${x(i)}" y="${Math.max(T+10,yy-5)}" text-anchor="middle" font-size="9" fill="currentColor">${Math.round(r.Standard/1000)}k</text>`;
  });
  svg+=dateTicks(cfg,rows.map(x=>x.date),x)+'</svg>';
  $('graph-daily').innerHTML=wrapGraph(cfg.title,cfg.note,'',svg);
}
function renderDailyLineGraph(){
  const rows=dailyProductionRows(),cfg=graphBase('Daily Normal Cream Usage by Line','Stacked daily usage showing how much of each day comes from A, B, C, and D production.');
  if(!rows.length){$('graph-line').innerHTML='<div class="empty">No daily line demand.</div>';return}
  const {W,H,L,R,T,B}=cfg,innerW=W-L-R,innerH=H-T-B;
  const ymax=Math.max(...rows.map(x=>x.Standard))*1.12||1,band=innerW/rows.length,barW=Math.min(68,band*.66);
  const x=i=>L+band*(i+.5),y=v=>T+innerH-(v/ymax)*innerH;
  const keys=[['AStandard','#24577d','A'],['BStandard','#0ea5b7','B'],['CStandard','#7756a3','C'],['DStandard','#687386','D']];
  let svg=`<svg viewBox="0 0 ${W} ${H}">${graphGrid(cfg,ymax)}`;
  rows.forEach((r,i)=>{
    let cum=0;
    keys.forEach(([k,color,label])=>{
      const val=r[k]||0;if(val<=0)return;
      const yTop=y(cum+val),yBot=y(cum),hh=yBot-yTop;
      svg+=`<rect x="${x(i)-barW/2}" y="${yTop}" width="${barW}" height="${hh}" fill="${color}"><title>${shortDate(r.date)} • ${label} Line: ${fmtLb(val)}</title></rect>`;
      cum+=val;
    });
  });
  svg+=dateTicks(cfg,rows.map(x=>x.date),x)+'</svg>';
  const legend=keys.map(([k,c,l])=>`<span><i style="background:${c}"></i>${l} Line</span>`).join('');
  $('graph-line').innerHTML=wrapGraph(cfg.title,cfg.note,legend,svg);
}
function receiptDateRows(){
  const tks=normalTankers(),m=new Map();
  for(const t of tks){
    const k=dayKey(t.receive);
    if(!m.has(k))m.set(k,{date:new Date(t.receive.getFullYear(),t.receive.getMonth(),t.receive.getDate()),count:0,capacity:0});
    const x=m.get(k);x.count++;x.capacity+=t.size;
  }
  return [...m.values()].sort((a,b)=>a.date-b.date);
}
function renderTankerDayGraph(){
  const rows=receiptDateRows(),cfg=graphBase(`Whole Normal Cream Tankers Required at ${cfgReceivingPoint()} by Day`,`Number of physical whole Normal Cream tankers that must be available at ${cfgReceivingPoint()} on each date before assignment to a configured destination site. A tanker is never split across sites.`);
  if(!rows.length){$('graph-tankers').innerHTML='<div class="empty">No Normal Cream tanker deliveries.</div>';return}
  const {W,H,L,R,T,B}=cfg,innerW=W-L-R,innerH=H-T-B;
  const ymax=Math.max(...rows.map(x=>x.count),1)+1,band=innerW/rows.length,barW=Math.min(68,band*.66);
  const x=i=>L+band*(i+.5),y=v=>T+innerH-(v/ymax)*innerH;
  let svg=`<svg viewBox="0 0 ${W} ${H}">${graphGrid(cfg,ymax,v=>Math.round(v).toString())}`;
  rows.forEach((r,i)=>{
    const yy=y(r.count),hh=T+innerH-yy;
    svg+=`<rect x="${x(i)-barW/2}" y="${yy}" width="${barW}" height="${hh}" rx="3" fill="#b7791f"><title>${shortDate(r.date)}: ${r.count} whole tanker(s), ${fmtLb(r.capacity)} assigned capacity</title></rect>`;
    svg+=`<text x="${x(i)}" y="${Math.max(T+10,yy-5)}" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor">${r.count}</text>`;
  });
  svg+=dateTicks(cfg,rows.map(x=>x.date),x)+'</svg>';
  $('graph-tankers').innerHTML=wrapGraph(cfg.title,cfg.note,'',svg);
}function unionDailyRows(){
  const m=new Map();
  for(const x of dailyProductionRows())m.set(dayKey(x.date),{date:x.date,use:x.Standard,capacity:0,count:0});
  for(const x of receiptDateRows()){
    const k=dayKey(x.date);if(!m.has(k))m.set(k,{date:x.date,use:0,capacity:0,count:0});
    const r=m.get(k);r.capacity=x.capacity;r.count=x.count;
  }
  return [...m.values()].sort((a,b)=>a.date-b.date);
}
function renderDailyCapacityGraph(){
  const rows=unionDailyRows(),cfg=graphBase('Daily Usage vs Whole-Tanker Capacity Received at D','Compares Normal Cream consumed that day with the total whole-tanker capacity received at D that day for assignment to configured destination sites. Site balances are not transferable, so use the physical tanker plan for coverage decisions.');
  if(!rows.length){$('graph-dailycap').innerHTML='<div class="empty">No data.</div>';return}
  const {W,H,L,R,T,B}=cfg,innerW=W-L-R,innerH=H-T-B;
  const ymax=Math.max(...rows.flatMap(x=>[x.use,x.capacity]))*1.12||1,band=innerW/rows.length,barW=Math.min(34,band*.28);
  const x=i=>L+band*(i+.5),y=v=>T+innerH-(v/ymax)*innerH;
  let svg=`<svg viewBox="0 0 ${W} ${H}">${graphGrid(cfg,ymax)}`;
  rows.forEach((r,i)=>{
    const yu=y(r.use),yc=y(r.capacity);
    svg+=`<rect x="${x(i)-barW-2}" y="${yu}" width="${barW}" height="${T+innerH-yu}" rx="2" fill="#24577d"><title>${shortDate(r.date)} cream used: ${fmtLb(r.use)}</title></rect>`;
    svg+=`<rect x="${x(i)+2}" y="${yc}" width="${barW}" height="${T+innerH-yc}" rx="2" fill="#198754"><title>${shortDate(r.date)} whole-tanker capacity received at D: ${fmtLb(r.capacity)} (${r.count} tanker(s))</title></rect>`;
  });
  svg+=dateTicks(cfg,rows.map(x=>x.date),x)+'</svg>';
  const legend=`<span><i style="background:#24577d"></i>Cream used</span><span><i style="background:#198754"></i>Whole-tanker capacity delivered to sites</span>`;
  $('graph-dailycap').innerHTML=wrapGraph(cfg.title,cfg.note,legend,svg);
}function renderBufferGraph(runs){
  const all=unionDailyRows();
  if(!all.length){$('graph-buffer').innerHTML='<div class="empty">No data.</div>';return}
  const cfg=graphBase('End-of-Day Assigned Cream Remaining','Total Normal Cream remaining across configured destination sites after continuous Start→Finish consumption through the end of each day. Site balances are not transferable.');
  const vals=all.map(r=>{
    const end=new Date(r.date.getFullYear(),r.date.getMonth(),r.date.getDate()+1,0,0,0);
    let buffer=0;
    for(const site of (CONFIG.schedule.siteKeys||[])){
      const received=normalTankers().filter(t=>t.dest===site&&t.receive<end).reduce((s,t)=>s+t.size,0);
      const used=cumulativeAt(S.runs.filter(x=>x.type==='Standard'&&Number.isFinite(x.cream)&&siteForLine(x.line)===site),end);
      buffer+=received-used;
    }
    return {date:r.date,buffer};
  });
  const {W,H,L,R,T,B}=cfg,innerW=W-L-R,innerH=H-T-B;
  const minV=Math.min(0,...vals.map(x=>x.buffer)),maxV=Math.max(1,...vals.map(x=>x.buffer));
  const pad=(maxV-minV||1)*.12,ymin=minV-pad,ymax=maxV+pad;
  const band=innerW/vals.length,x=i=>L+band*(i+.5),y=v=>T+innerH-((v-ymin)/(ymax-ymin))*innerH;
  let svg=`<svg viewBox="0 0 ${W} ${H}">`;
  for(let i=0;i<=4;i++){
    const v=ymin+(ymax-ymin)*i/4,yy=y(v);
    svg+=`<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" stroke="currentColor" opacity=".10"/>`;
    svg+=`<text x="${L-8}" y="${yy+4}" text-anchor="end" font-size="10" fill="currentColor" opacity=".65">${Math.round(v/1000)}k</text>`;
  }
  let path='';
  vals.forEach((r,i)=>{path+=(i?' L ':'M ')+x(i).toFixed(1)+' '+y(r.buffer).toFixed(1)});
  svg+=`<path d="${path}" fill="none" stroke="#7756a3" stroke-width="3"/>`;
  vals.forEach((r,i)=>svg+=`<circle cx="${x(i)}" cy="${y(r.buffer)}" r="4" fill="#7756a3"><title>${shortDate(r.date)} total assigned-site remaining: ${fmtLb(r.buffer)}</title></circle>`);
  svg+=dateTicks(cfg,vals.map(x=>x.date),x)+'</svg>';
  $('graph-buffer').innerHTML=wrapGraph(cfg.title,cfg.note,'',svg);
}function renderDaily(){
  if(!S.daily.length){$('dailyWrap').innerHTML='<div class="empty">No valid Normal Cream demand rows.</div>';return}
  const tk=dailyTankerRequirements();
  let h=`<table><thead><tr><th>Date</th><th>Tankers Required</th><th>Normal Cream Total</th><th>A Line</th><th>B Line</th><th>C Line</th><th>D Line</th></tr></thead><tbody>`;
  for(const x of S.daily){
    if(x.Standard<=0.0001) continue;
    h+=`<tr><td>${shortDate(x.date)}</td><td><b>${tk.get(dayKey(x.date))||0}</b></td><td class="stdTxt"><b>${fmtLb(x.Standard)}</b></td><td>${fmtLb(x.AStandard)}</td><td>${fmtLb(x.BStandard)}</td><td>${fmtLb(x.CStandard)}</td><td>${fmtLb(x.DStandard)}</td></tr>`;
  }
  h+='</tbody></table>';
  $('dailyWrap').innerHTML=h;
}

function renderDailyAudit(){
  if(!S.dailyAudit.length){$('dailyAuditWrap').innerHTML='<div class="empty">No Normal Cream audit rows.</div>';return}
  const groups=new Map();
  for(const r of S.dailyAudit){
    const k=dayKey(r.date);
    if(!groups.has(k))groups.set(k,{date:r.date,rows:[],total:0});
    const g=groups.get(k);g.rows.push(r);g.total+=r.dailyCream;
  }
  let h='';
  for(const g of [...groups.values()].sort((a,b)=>a.date-b.date)){
    h+=`<details class="auditday" open><summary><div><div class="aud-date">${shortDate(g.date)}</div><div class="aud-sub">${g.rows.length} contribution${g.rows.length===1?'':'s'} • click to collapse</div></div><div class="aud-total">${fmtLb(g.total)}</div></summary><div class="auditbody"><div class="tablewrap" style="max-height:360px"><table><thead><tr><th>Schedule</th><th>Line</th><th>Item</th><th>Description</th><th>Cases</th><th>Start</th><th>Finish</th><th>Cream/Case</th><th>Item Cream</th><th>Used This Day</th><th>Share</th></tr></thead><tbody>`;
    for(const r of g.rows){
      h+=`<tr><td>${esc(r.schedule)}</td><td>${esc(r.line)}</td><td class="left"><b>${esc(r.code)}</b></td><td class="left">${esc(r.desc)}</td><td>${fmtNum(r.cases,0)}</td><td>${dt(r.start)}</td><td>${dt(r.finish)}</td><td>${fmtNum(r.factor,4)}</td><td>${fmtLb(r.itemCream)}</td><td><b>${fmtLb(r.dailyCream)}</b></td><td>${fmtNum(r.share*100,1)}%</td></tr>`;
    }
    h+='</tbody></table></div></div></details>';
  }
  $('dailyAuditWrap').innerHTML=h;
}

function renderReceiving(){
  const rs=normalTankers();
  if(!rs.length){$('receivingWrap').innerHTML='<div class="empty">No Normal Cream physical tanker deliveries calculated.</div>';return}
  let h=`<div class="note" style="margin-bottom:8px"><b>Continuous whole-tanker plan.</b> Cream is consumed continuously from Start → Finish at each destination. “${esc(cfgRequiredByLabel())}” = the projected site need/shortage time minus ${leadHours()} hours. Every tanker is available at ${esc(cfgReceivingPoint())} first; internal transfer is inside that ${leadHours()}-hour window with no added buffer. Each tanker is assigned wholly to one configured destination site.</div>`;
  h+=`<table><thead><tr><th>Required Date</th><th>${esc(cfgRequiredByLabel())}</th><th>Cream Needed at Site Around</th><th>Tanker #</th><th>Destination</th><th>Tanker Size</th><th>Active Production at Need Time</th><th>Site Use Rate</th><th>Cumulative Site Cream Used</th><th>Balance Before</th><th>After Delivery</th></tr></thead><tbody>`;
  for(const t of rs){
    h+=`<tr><td>${shortDate(t.receive)}</td><td><b>${dt(t.receive)}</b></td><td><b>${dt(t.neededAtSite||t.trigger)}</b></td><td>T${t.no}</td><td class="left"><b>${esc(cfgSiteLabel(t.dest))}</b></td><td>${fmtLb(t.size)}</td><td class="left">${esc(t.activeText||'Site demand begins / resumes')}</td><td>${fmtLb(t.siteUseRate||0)}/hr</td><td>${fmtLb(t.cumulativeUsed||0)}</td><td>${fmtLb(t.balanceBeforeDelivery||0)}</td><td><b>${fmtLb(t.balanceAfterDelivery||0)}</b></td></tr>`;
  }
  h+='</tbody></table>';
  $('receivingWrap').innerHTML=h;
}function renderTankers(){
  const rows=normalTankers();
  const totalDemand=(CONFIG.schedule.siteKeys||[]).reduce((sum,site)=>sum+(S.siteSummary[site]?.demand||0),0);
  const totalEnding=(CONFIG.schedule.siteKeys||[]).reduce((sum,site)=>sum+(S.siteSummary[site]?.ending||0),0);
  const totalCapacity=rows.reduce((sum,t)=>sum+t.size,0);
  const overall=`<div class="sitecard"><h4>PHYSICAL PLAN — TOTAL</h4><div class="big">${rows.length} tankers</div><div class="muted">${fmtLb(totalDemand)} demand • ${fmtLb(totalCapacity)} delivered • ${fmtLb(totalEnding)} remains across sites</div></div>`;
  const cards=(CONFIG.schedule.siteKeys||[]).map(site=>{
    const x=S.siteSummary[site]||{tankers:0,demand:0,ending:0,capacity:0};
    const title=cfgSiteLabel(site);
    return `<div class="sitecard"><h4>${title}</h4><div class="big">${x.tankers} tanker${x.tankers===1?'':'s'}</div><div class="muted">Demand ${fmtLb(x.demand)} • Ending ${fmtLb(x.ending)} • Opening 0 lb</div></div>`;
  });
  $('siteCards').innerHTML=[overall,...cards].join('');
  if(!rows.length){$('tankerWrap').innerHTML='<div class="empty">No Normal Cream physical tanker demand calculated.</div>';return}
  let h=`<div class="sectiontitle"><h3 class="stdTxt">NORMAL CREAM — CONTINUOUS WHOLE-TANKER DISPATCH PLAN</h3></div>`;
  h+=`<table><thead><tr><th>Dispatch Priority</th><th>${esc(cfgRequiredByLabel())}</th><th>Needed at Site Around</th><th>Destination</th><th>Site Tanker #</th><th>Tanker Size</th><th>Active Production at Need Time</th><th>Site Use Rate</th><th>Cumulative Site Cream Used</th><th>Balance Before</th><th>After Delivery</th></tr></thead><tbody>`;
  for(const t of rows) h+=`<tr><td><b>T${t.no}</b></td><td><b>${dt(t.receive)}</b></td><td>${dt(t.neededAtSite||t.trigger)}</td><td class="left"><b>${esc(cfgSiteLabel(t.dest))}</b></td><td>${esc(cfgSiteLabel(t.dest))}-${t.siteNo}</td><td>${fmtLb(t.size)}</td><td class="left">${esc(t.activeText||'Site demand begins / resumes')}</td><td>${fmtLb(t.siteUseRate||0)}/hr</td><td>${fmtLb(t.cumulativeUsed||0)}</td><td>${fmtLb(t.balanceBeforeDelivery||0)}</td><td><b>${fmtLb(t.balanceAfterDelivery||0)}</b></td></tr>`;
  h+='</tbody></table>';
  $('tankerWrap').innerHTML=h;
}function renderSiteLedger(){
  const wrap=$('siteLedgerWrap'); if(!wrap) return;
  if(!S.scheduleWB){wrap.innerHTML='<div class="empty">Upload the schedule to build the site balance ledger.</div>';return}
  if(S.blocked){wrap.innerHTML='<div class="empty">Site balance ledger is blocked until schedule timing is complete.</div>';return}
  let h='';
  for(const site of (CONFIG.schedule.siteKeys||[])){
    const rows=S.siteLedgers[site]||[];
    const sum=S.siteSummary[site]||{opening:0,demand:0,tankers:0,ending:0};
    const title=cfgSiteLabel(site);
    h+=`<details class="auditday" open><summary><div><div class="aud-date">${title}</div><div class="aud-sub">Opening 0 lb • ${sum.tankers} tanker${sum.tankers===1?'':'s'} • ${fmtLb(sum.demand)} continuous scheduled requirement</div></div><div class="aud-total">Ending ${fmtLb(sum.ending)}</div></summary><div class="auditbody"><div class="tablewrap" style="max-height:420px"><table><thead><tr><th>Time / Window</th><th>Event</th><th>Active Production</th><th>Change</th><th>Running Site Balance</th><th>Note</th></tr></thead><tbody>`;
    for(const r of rows){
      const change=r.change>0?`+${fmtLb(r.change)}`:r.change<0?`−${fmtLb(Math.abs(r.change))}`:'0 lb';
      const window=r.time?(r.timeEnd?`${dt(r.time)} → ${dt(r.timeEnd)}`:dt(r.time)):'Opening';
      h+=`<tr><td>${window}</td><td class="left"><b>${esc(r.event)}</b></td><td class="left">${esc(r.activeText||'')}</td><td>${change}</td><td><b>${fmtLb(r.balance)}</b></td><td class="left">${esc(r.note||'')}</td></tr>`;
    }
    h+='</tbody></table></div></div></details>';
  }
  wrap.innerHTML=h;
}

function renderOrganic(){
  const days=S.daily.filter(x=>x.Organic>0.0001);
  if(!days.length){
    $('organicDailyWrap').innerHTML='<div class="empty">No Organic Cream is scheduled.</div>';
  }else{
    let h=`<table><thead><tr><th>Date</th><th>A Line Organic</th><th>B Line Organic</th><th>C Line Organic</th><th>D Line Organic</th><th>Organic Total</th></tr></thead><tbody>`;
    for(const x of days) h+=`<tr><td>${shortDate(x.date)}</td><td>${fmtLb(x.AOrganic)}</td><td>${fmtLb(x.BOrganic)}</td><td>${fmtLb(x.COrganic)}</td><td>${fmtLb(x.DOrganic)}</td><td class="orgTxt"><b>${fmtLb(x.Organic)}</b></td></tr>`;
    h+='</tbody></table>';
    $('organicDailyWrap').innerHTML=h;
  }

  const tr=S.tankers.filter(t=>t.type==='Organic').sort((a,b)=>a.receive-b.receive);
  if(!tr.length){
    $('organicReceivingWrap').innerHTML='<div class="empty">No Organic tanker arrivals calculated.</div>';
  }else{
    let h=`<table><thead><tr><th>${esc(cfgReceivingPoint())} Date</th><th>${esc(cfgRequiredByLabel())}</th><th>Tanker #</th><th>Load Size</th><th>Scheduled Demand on Load</th><th>Destinations Covered</th><th>Starts Being Used</th><th>Covers Through</th></tr></thead><tbody>`;
    for(const t of tr) h+=`<tr><td>${shortDate(t.receive)}</td><td><b>${dt(t.receive)}</b></td><td>T${t.no}</td><td>${fmtLb(t.size)}</td><td>${fmtLb(t.planned)}</td><td class="left">${esc(t.coverageDestinations||'—')}</td><td>${dt(t.trigger)}</td><td>${dt(t.coverageEnd)}</td></tr>`;
    h+='</tbody></table>';
    $('organicReceivingWrap').innerHTML=h;
  }

  const orgRuns=S.runs.filter(r=>r.type==='Organic');
  if(!orgRuns.length){
    $('organicDetailWrap').innerHTML='<div class="empty">No Organic scheduled items.</div>';
  }else{
    let h=`<table><thead><tr><th>Start</th><th>Finish</th><th>Schedule</th><th>Line</th><th>Item</th><th>Description</th><th>Cases</th><th>Raw Cream Cell</th><th>Cream/Case</th><th>Total Organic Cream</th><th>Classification Evidence</th></tr></thead><tbody>`;
    for(const r of orgRuns){
      h+=`<tr><td>${dt(r.start)}</td><td>${dt(r.finish)}</td><td>${r.schedule}</td><td>${r.line}</td><td class="left"><b>${esc(r.code)}</b></td><td class="left">${esc(r.desc)}</td><td>${fmtNum(r.cases,0)}</td><td class="left">${esc(r.rawCreamValue??'')}</td><td>${Number.isFinite(r.factor)?fmtNum(r.factor,4):'MISSING'}</td><td class="orgTxt">${Number.isFinite(r.cream)?fmtLb(r.cream):'MISSING'}</td><td class="left">${esc(r.classificationEvidence||'')}</td></tr>`;
    }
    h+='</tbody></table>';
    $('organicDetailWrap').innerHTML=h;
  }
}

function renderDetail(){
  if(!S.runs.length){$('detailWrap').innerHTML='<div class="empty">No production rows found.</div>';return}
  let h=`<table><thead><tr><th>Start</th><th>Finish</th><th>Schedule</th><th>Line</th><th>Destination Pool</th><th>Item</th><th>Description</th><th>Formula</th><th>Cases</th><th>Raw Cream Cell</th><th>Cream/Case</th><th>Cream Type</th><th>Classification Evidence</th><th>Total Cream incl. Waste</th><th>Factor Source</th></tr></thead><tbody>`;
  for(const r of S.runs){
    const bad=!Number.isFinite(r.cream);
    h+=`<tr class="${bad?'errrow':''}"><td>${dt(r.start)}</td><td>${dt(r.finish)}</td><td>${r.schedule}</td><td>${r.line}</td><td class="left">${esc(r.dest)}</td><td class="left"><b>${esc(r.code)}</b></td><td class="left">${esc(r.desc)}</td><td class="left">${esc(r.formula)}</td><td>${fmtNum(r.cases,0)}</td><td class="left">${esc(r.rawCreamValue??'')}</td><td>${Number.isFinite(r.factor)?fmtNum(r.factor,4):'<b>MISSING</b>'}</td><td class="left">${r.type}</td><td class="left">${esc(r.classificationEvidence||'')}</td><td>${Number.isFinite(r.cream)?fmtLb(r.cream):'<b>MISSING</b>'}</td><td class="left">${esc(r.source)}</td></tr>`;
  }
  h+='</tbody></table>';$('detailWrap').innerHTML=h;
}
function renderIssues(){
  let h='';
  if(!S.issues.length){
    h+='<div class="empty" style="padding:18px">No cream-factor or schedule-time errors found.</div>';
  }else{
    h+=S.issues.map(i=>`<div class="issue"><b>${i.level.toUpperCase()}:</b> ${esc(i.msg)}</div>`).join('');
  }
  if(S.zeroCream.length){
    h+=`<div class="issue" style="border-top:2px solid var(--line)"><b style="color:var(--green)">VALID ZERO-CREAM ITEMS:</b> ${S.zeroCream.length} scheduled row(s) have Cream/Case explicitly marked N/A and are correctly treated as 0 raw cream.</div>`;
    h+=`<div class="tablewrap" style="max-height:260px;margin:10px"><table><thead><tr><th>Schedule</th><th>Line</th><th>Item</th><th>Description</th><th>Rule</th></tr></thead><tbody>`;
    h+=S.zeroCream.map(z=>`<tr><td>${esc(z.schedule)}</td><td>${esc(z.line)}</td><td class="left"><b>${esc(z.code)}</b></td><td class="left">${esc(z.desc)}</td><td class="left">${esc(z.reason)}</td></tr>`).join('');
    h+='</tbody></table></div>';
  }
  $('issueWrap').innerHTML=h;
}
function renderCodes(){
  $('codeBox').innerHTML=[...S.excluded].sort().map(c=>`<span class="codepill">${esc(c)}</span>`).join('');
}

function csvDownload(name,rows){
  const csv=rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\r\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);
}

function updateClearButtons(){
  $('clearScheduleBtn').disabled=!S.scheduleWB; if($('breakClearScheduleBtn')) $('breakClearScheduleBtn').disabled=!S.scheduleWB;
  $('clearMasterBtn').disabled=!S.masterWB;
  $('clearBomBtn').disabled=!S.bomWB;
  $('clearOhBtn').disabled=!S.ohWB;
}
function clearUpload(kind){
  if(kind==='schedule'){
    S.scheduleWB=null;S.scheduleName='';S.embeddedMaster=new Map();
    $('scheduleInput').value=''; if($('breakScheduleInput')) $('breakScheduleInput').value=''; $('scheduleFile').textContent='No schedule loaded'; if($('breakScheduleFile')) $('breakScheduleFile').textContent='No schedule loaded';
    S.runs=[];S.issues=[];S.preflight=[];S.blocked=false;S.demoMode=false;S.zeroCream=[];S.tankers=[];S.daily=[];S.dailyAudit=[];S.receiving=[];S.siteLedgers={};S.siteSummary={};
  }else if(kind==='master'){
    S.masterWB=null;S.masterName='';S.externalMaster=new Map();
    $('masterInput').value='';$('masterFile').textContent='No external master loaded';
  }else if(kind==='bom'){
    S.bomWB=null;S.bomName='';S.bomMap=new Map();
    $('bomInput').value='';$('bomFile').textContent='No BOM loaded';
  }else if(kind==='oh'){
    S.ohWB=null;S.ohName='';S.componentInfo=new Map();
    $('ohInput').value='';$('ohFile').textContent='No inventory file loaded';
  }
  updateClearButtons();
  if(S.scheduleWB) recalc(); else renderAll();
}

function workbookSignature(wb){
  const sig={
    hasSchedule:false,hasMaster:false,hasBom:false,hasOh:false,
    scheduleSheets:0,masterScore:0,bomScore:0,ohScore:0
  };
  if(!wb) return sig;
  const validSheetNames=new Set((CONFIG.schedule.lineIds||[]).flatMap(line=>(CONFIG.schedule.slotNumbers||[]).map(slot=>cfgScheduleSheetName(slot,line).toUpperCase())));
  sig.scheduleSheets=wb.SheetNames.filter(x=>validSheetNames.has(String(x).toUpperCase())).length;
  sig.hasSchedule=sig.scheduleSheets>=1;

  for(const sname of wb.SheetNames){
    const lname=sname.toLowerCase();
    if(cfgTextEqualsAny(lname,CONFIG.inputAliases?.masterSheetExact)||cfgTextMatchesAny(lname,CONFIG.inputAliases?.masterSheetContains)) sig.masterScore+=4;
    if(cfgTextMatchesAny(lname,CONFIG.inputAliases?.bomSheetContains)) sig.bomScore+=5;
    if(cfgTextEqualsAny(lname,CONFIG.inputAliases?.ohSheetExact)||cfgTextMatchesAny(lname,CONFIG.inputAliases?.ohSheetContains)) sig.ohScore+=4;

    const ws=wb.Sheets[sname];
    const rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null,blankrows:false});
    for(let r=0;r<Math.min(rows.length,15);r++){
      const hdr=(rows[r]||[]).map(norm);
      if(hdr.some(h=>h.includes('raw cream')&&h.includes('bill'))) sig.masterScore+=6;
      if(hdr.some(h=>h==='billno'||h==='bill no') && hdr.some(h=>h.includes('componentitemcode')||h==='component item code')) sig.bomScore+=7;
      if(hdr.some(h=>h==='itemcode'||h==='item code') && hdr.some(h=>h.includes('totalquantityonhand')||h==='total quantity on hand')) sig.ohScore+=7;
    }
  }
  sig.hasMaster=sig.masterScore>=5;
  sig.hasBom=sig.bomScore>=5;
  sig.hasOh=sig.ohScore>=5;
  return sig;
}
function detectWorkbookKind(wb,fileName){
  const sig=workbookSignature(wb);
  const fn=String(fileName||'').toLowerCase();

  // Strong structural signals first.
  if(sig.scheduleSheets>=2) return 'schedule';
  if(sig.bomScore>=7) return 'bom';
  if(sig.ohScore>=7) return 'oh';
  if(sig.masterScore>=6) return 'master';

  // Filename fallback for ambiguous files.
  if(cfgTextMatchesAny(fn,CONFIG.inputAliases?.scheduleFilePatterns) && sig.hasSchedule) return 'schedule';
  if(cfgTextMatchesAny(fn,CONFIG.inputAliases?.bomFilePatterns)) return 'bom';
  if(cfgTextMatchesAny(fn,CONFIG.inputAliases?.ohFilePatterns)) return 'oh';
  if(cfgTextMatchesAny(fn,CONFIG.inputAliases?.masterFilePatterns)) return 'master';

  // Weaker structural fallback.
  if(sig.hasSchedule) return 'schedule';
  if(sig.hasBom) return 'bom';
  if(sig.hasOh) return 'oh';
  if(sig.hasMaster) return 'master';
  return null;
}
function assignLoadedWorkbook(wb,file,kind){
  if(kind==='schedule'){
    S.scheduleWB=wb;S.scheduleName=file.name;
    $('scheduleFile').textContent=file.name; if($('breakScheduleFile')) $('breakScheduleFile').textContent=file.name;
  }else if(kind==='master'){
    S.masterWB=wb;S.masterName=file.name;S.externalMaster=findMasterMap(wb);
    $('masterFile').textContent=file.name+(S.externalMaster.size?` — ${S.externalMaster.size} items found`:' — no cream-factor table detected');
  }else if(kind==='bom'){
    S.bomWB=wb;S.bomName=file.name;S.bomMap=findBOMMap(wb);
    $('bomFile').textContent=file.name+(S.bomMap.size?` — ${S.bomMap.size} bills mapped`:' — BOM mapping not detected');
  }else if(kind==='oh'){
    S.ohWB=wb;S.ohName=file.name;S.componentInfo=findComponentInfo(wb);
    $('ohFile').textContent=file.name+(S.componentInfo.size?` — ${S.componentInfo.size} inventory records`:' — inventory mapping not detected');
  }
}
async function loadBulkFiles(files){
  const list=[...(files||[])].filter(f=>/\.(xlsx|xlsm|xls)$/i.test(f.name));
  if(!list.length){$('bulkStatus').textContent='No Excel files detected.';return}
  $('bulkStatus').textContent=`Reading ${list.length} file(s)…`;
  const results=[];
  for(const file of list){
    try{
      const wb=await readWB(file);
      const kind=detectWorkbookKind(wb,file.name);
      if(kind){
        assignLoadedWorkbook(wb,file,kind);
        results.push(`${file.name} → ${kind.toUpperCase()}`);
      }else{
        results.push(`${file.name} → NOT RECOGNIZED`);
      }
    }catch(e){
      results.push(`${file.name} → LOAD FAILED`);
      console.error(e);
    }
  }
  updateClearButtons();
  $('bulkStatus').textContent=results.join('  |  ');
  recalc();
}
function setupBulkDrop(){
  const drop=$('bulkDrop'),input=$('bulkInput');
  ['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{
    e.preventDefault();drop.classList.add('drag');
  }));
  ['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{
    e.preventDefault();drop.classList.remove('drag');
  }));
  drop.addEventListener('drop',e=>{
    e.stopPropagation();
    if(e.dataTransfer.files?.length) loadBulkFiles(e.dataTransfer.files);
  });
  input.addEventListener('change',e=>{
    if(e.target.files?.length) loadBulkFiles(e.target.files);
  });
}

function setupDrop(inputId,dropId,fileId,kind){
  const input=$(inputId),drop=$(dropId);
  ['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('drag')}));
  ['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('drag')}));
  drop.addEventListener('drop',e=>{const f=e.dataTransfer.files?.[0];if(f) loadFile(f,kind,fileId)});
  input.addEventListener('change',e=>{const f=e.target.files?.[0];if(f) loadFile(f,kind,fileId)});
}
async function loadFile(file,kind,fileId){
  try{
    $(fileId).textContent='Loading '+file.name+'…';
    const wb=await readWB(file);
    assignLoadedWorkbook(wb,file,kind);
    updateClearButtons();
    recalc();
  }catch(e){
    $(fileId).textContent='Load failed: '+e.message;console.error(e);
  }
}

setupBulkDrop();
setupDrop('scheduleInput','scheduleDrop','scheduleFile','schedule');
setupDrop('breakScheduleInput','breakScheduleDrop','breakScheduleFile','schedule');
setupDrop('masterInput','masterDrop','masterFile','master');
setupDrop('bomInput','bomDrop','bomFile','bom');
setupDrop('ohInput','ohDrop','ohFile','oh');
$('clearScheduleBtn').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();clearUpload('schedule')});
$('breakClearScheduleBtn').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();clearUpload('schedule')});
$('clearMasterBtn').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();clearUpload('master')});
$('clearBomBtn').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();clearUpload('bom')});
$('clearOhBtn').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();clearUpload('oh')});

['leadHours','orgTank','wastePct','timingModel'].forEach(id=>$(id).addEventListener('change',recalc));
$('stdTank').addEventListener('change',()=>{if($('breakStdTank'))$('breakStdTank').value=$('stdTank').value;recalc();});
$('breakStdTank').addEventListener('change',()=>{$('stdTank').value=$('breakStdTank').value;recalc();});
$('applyExclude').addEventListener('click',()=>{
  S.excluded=new Set($('excludeInput').value.split(/[,;\n]/).map(codeNorm).filter(Boolean));recalc();
});
$('themeBtn').addEventListener('click',()=>document.body.classList.toggle('dark'));
$('resetBtn').addEventListener('click',()=>{
  S.scheduleWB=null;S.masterWB=null;S.bomWB=null;S.ohWB=null;S.scheduleName='';S.masterName='';S.bomName='';S.ohName='';
  S.externalMaster=new Map();S.embeddedMaster=new Map();S.bomMap=new Map();S.componentInfo=new Map();
  S.runs=[];S.issues=[];S.preflight=[];S.blocked=false;S.demoMode=false;S.zeroCream=[];S.tankers=[];S.daily=[];S.dailyAudit=[];S.receiving=[];S.siteLedgers={};S.siteSummary={};
  $('scheduleInput').value='';$('breakScheduleInput').value='';$('masterInput').value='';$('bomInput').value='';$('ohInput').value='';$('bulkInput').value='';$('bulkStatus').textContent='No bulk files loaded';
  $('scheduleFile').textContent='No schedule loaded';$('breakScheduleFile').textContent='No schedule loaded';$('masterFile').textContent='No external master loaded';$('bomFile').textContent='No BOM loaded';$('ohFile').textContent='No inventory file loaded';updateClearButtons();renderAll();
});
$('graphSelect').addEventListener('change',graphVisibility);
document.querySelectorAll('.pagebtn').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.pagebtn').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.apppage').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');$('page-'+b.dataset.page).classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
}));
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.tabpage').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');$('tab-'+b.dataset.tab).classList.add('active');
}));
$('calloutCsv').addEventListener('click',()=>csvDownload(`${CONFIG.app.outputPrefix}_Cream_Usage_Callout.csv`,[
  ['Date','Line','Item','Schedule','From','To','Cases in 24h Span','Normal Cream lb'],
  ...S.dailyAudit.map(r=>[shortDate(r.date),r.line,r.code,r.schedule,timeOnly(r.segmentStart),timeOnly(r.segmentEnd),Math.round(r.dailyCases),Math.round(r.dailyCream)])
]));
$('downloadCreamBreakdownBtn').addEventListener('click',downloadCreamUsageBreakdown);
$('breakDownloadBtn').addEventListener('click',downloadCreamUsageBreakdown);
$('dailyCsv').addEventListener('click',()=>csvDownload(`${CONFIG.app.outputPrefix}_Cream_Daily_Requirement.csv`,[
  ['Date','A Normal Cream Milk lb','B Normal Cream Milk lb','C Normal Cream Milk lb','D Normal Cream Milk lb','NORMAL Cream Milk Total lb','Organic Cream Milk lb (SEPARATE)'],
  ...S.daily.map(x=>[shortDate(x.date),Math.round(x.AStandard),Math.round(x.BStandard),Math.round(x.CStandard),Math.round(x.DStandard),Math.round(x.Standard),Math.round(x.Organic)])
]));
$('dailyAuditCsv').addEventListener('click',()=>csvDownload(`${CONFIG.app.outputPrefix}_Normal_Cream_Daily_Audit.csv`,[
  ['Date','Schedule','Line','Item','Description','Cases','Start','Finish','Cream/Case','Item Cream incl Waste lb','Daily Allocated Cream lb','Share of Item'],
  ...S.dailyAudit.map(r=>[shortDate(r.date),r.schedule,r.line,r.code,r.desc||'',r.cases,dt(r.start),dt(r.finish),r.factor,Math.round(r.itemCream),Math.round(r.dailyCream),r.share])
]));
$('tankerCsv').addEventListener('click',()=>csvDownload(`${CONFIG.app.outputPrefix}_Normal_Cream_Physical_Site_Tanker_Plan.csv`,[
  ['Dispatch Priority',cfgRequiredByLabel(),'Needed at Site Around','Destination Site','Site Tanker #','Tanker Size lb','Active Production at Need Time','Site Use Rate lb/hr','Cumulative Site Cream Used lb','Balance Before Delivery lb','Balance After Delivery lb'],
  ...S.tankers.filter(t=>t.type==='Standard').sort((a,b)=>a.receive-b.receive).map(t=>[t.no,dt(t.receive),dt(t.neededAtSite||t.trigger),cfgSiteLabel(t.dest),t.siteNo,Math.round(t.size),t.activeText||'',Math.round(t.siteUseRate||0),Math.round(t.cumulativeUsed||0),Math.round(t.balanceBeforeDelivery||0),Math.round(t.balanceAfterDelivery||0)])
]));

function archiveSheetName(prefix, original, used){
  const base=(prefix+'_'+String(original||'Sheet')).replace(/[\\\/\?\*\[\]:]/g,'_');
  let name=base.slice(0,31)||'Input';
  let n=2;
  while(used.has(name.toUpperCase())){
    const suffix='_'+n++;
    name=base.slice(0,31-suffix.length)+suffix;
  }
  used.add(name.toUpperCase());
  return name;
}
function appendInputWorkbookArchive(outWB, sourceWB, role, fileName, prefix, used, manifestRows){
  if(!sourceWB) return;
  for(const originalName of sourceWB.SheetNames){
    const src=sourceWB.Sheets[originalName];
    const data=XLSX.utils.sheet_to_json(src,{
      header:1,raw:true,defval:null,blankrows:true
    });
    const archiveRows=[
      ['INPUT ARCHIVE — SOURCE DATA USED BY DASHBOARD'],
      ['Input Role',role],
      ['Source File',fileName||''],
      ['Original Sheet',originalName],
      ['Original Range',src['!ref']||''],
      [],
      ...data
    ];
    const ws=XLSX.utils.aoa_to_sheet(archiveRows);
    ws['!cols']=[{wch:24},{wch:24},{wch:24},{wch:24},{wch:24},{wch:24}];
    const archiveName=archiveSheetName(prefix,originalName,used);
    XLSX.utils.book_append_sheet(outWB,ws,archiveName);
    manifestRows.push([
      role,
      fileName||'',
      originalName,
      archiveName,
      src['!ref']||'',
      data.length,
      data.reduce((m,row)=>Math.max(m,(row||[]).length),0)
    ]);
  }
}

function downloadCreamUsageBreakdown(){
  if(!S.scheduleWB||S.blocked) return;
  const wb=XLSX.utils.book_new();
  const start=scheduleStartMatrix();
  const tk=dailyTankerRequirements();
  const normalTotal=S.daily.reduce((sum,x)=>sum+x.Standard,0);
  const totalTankers=Math.ceil((normalTotal-1e-8)/tankerSize('Standard'));

  const groups=new Map();
  for(const r of S.dailyAudit){
    const k=dayKey(r.date);
    if(!groups.has(k)) groups.set(k,{date:r.date,lines:{A:[],B:[],C:[],D:[]},lineTotals:{A:0,B:0,C:0,D:0}});
    const g=groups.get(k);
    if(g.lines[r.line]){g.lines[r.line].push(r);g.lineTotals[r.line]+=r.dailyCream;}
  }
  for(const g of groups.values()) for(const line of ['A','B','C','D']) g.lines[line].sort((a,b)=>a.segmentStart-b.segmentStart||a.schedule.localeCompare(b.schedule));

  const activeDaily=S.daily.filter(x=>x.Standard>0.0001);
  const rows=[
    ['CREAM USAGE BREAKDOWN'],
    ['Schedule File',S.scheduleName||''],
    ['Milk Tanker Size - 1 Tanker (lb)',tankerSize('Standard')],
    ['24-Hour Rule','Each date is 12:00 AM through the next 12:00 AM. Cross-midnight runs are split by actual Start/Finish overlap.'],
    ['Missing Date/Time Rule','MISSING DATE/TIME in the start matrix is allowed when that schedule is unused. Active scheduled rows with invalid Start/Finish block the analysis.'],
    [],
    ['SCHEDULE START DATE & TIME — 1A THROUGH 6D'],
    ['Line / Schedule','1','2','3','4','5','6']
  ];
  for(const r of start) rows.push([r.line,...r.values.map(x=>x.valid?dt(x.date):'MISSING DATE/TIME')]);

  rows.push([]);
  const quickTitleIdx=rows.length; rows.push(['TABLE 1 — DAILY CREAM QUICK VIEW']);
  const quickHeaderIdx=rows.length; rows.push(['Date','Tankers Required','Total Normal Cream','A Line','B Line','C Line','D Line']);
  const quickDataStartIdx=rows.length;
  for(const x of activeDaily) rows.push([shortDate(x.date),tk.get(dayKey(x.date))||0,x.Standard,x.AStandard,x.BStandard,x.CStandard,x.DStandard]);
  const totalIdx=rows.length; rows.push(['TOTAL',totalTankers,normalTotal]);
  rows.push([]);
  const breakdownTitleIdx=rows.length; rows.push(['TABLE 2 — DAILY LINE RUN BREAKDOWN']);
  const breakdownHeaderIdx=rows.length; rows.push(['Date','Tankers Required','Total Normal Cream','A Line — Run Breakdown','B Line — Run Breakdown','C Line — Run Breakdown','D Line — Run Breakdown']);
  const detailStartRow=rows.length;
  const sortedGroups=[...groups.values()].sort((a,b)=>a.date-b.date);
  for(const g of sortedGroups){
    const lineText=line=>{
      const parts=[`${line} Line Total: ${fmtNum(g.lineTotals[line],2)} lb`];
      for(const r of g.lines[line]) parts.push(`${r.code} | ${r.schedule} | ${timeOnly(r.segmentStart)}–${timeOnly(r.segmentEnd)} | ${fmtNum(r.dailyCases,0)} Cases (${fmtNum(r.dailyCream,0)} lb Cream)`);
      if(!g.lines[line].length) parts.push('No Normal Cream run');
      return parts.join('\n');
    };
    const dayTotal=['A','B','C','D'].reduce((sum,line)=>sum+g.lineTotals[line],0);
    rows.push([shortDate(g.date),tk.get(dayKey(g.date))||0,dayTotal,lineText('A'),lineText('B'),lineText('C'),lineText('D')]);
  }
  const detailTotalIdx=rows.length;
  rows.push(['TOTAL',totalTankers,normalTotal,'END OF SCHEDULE — TOTAL TANKERS & NORMAL CREAM','','','']);

  const ws=XLSX.utils.aoa_to_sheet(rows);
  ws['!cols']=[{wch:11},{wch:14},{wch:17},{wch:46},{wch:46},{wch:46},{wch:46}];
  ws['!merges']=[
    XLSX.utils.decode_range('A1:G1'),
    XLSX.utils.decode_range('B2:G2'),
    XLSX.utils.decode_range('B4:G4'),
    XLSX.utils.decode_range('B5:G5'),
    XLSX.utils.decode_range('A7:G7'),
    XLSX.utils.decode_range(`A${quickTitleIdx+1}:G${quickTitleIdx+1}`),
    XLSX.utils.decode_range(`A${breakdownTitleIdx+1}:G${breakdownTitleIdx+1}`),
    XLSX.utils.decode_range(`D${detailTotalIdx+1}:G${detailTotalIdx+1}`)
  ];

  const C={navy:'163A5F',navy2:'245A85',text:'17324D',grid:'B9C8D8',white:'FFFFFF',pale:'F5F8FC',alt:'ECF3F9',
    a:'2E75B6',al:'EAF3FB',b:'548A64',bl:'EDF6F0',c:'B67A22',cl:'FFF5E3',d:'754A91',dl:'F4ECF8',
    teal:'1F7A8C',gold:'D9A441',warn:'B42318',warnbg:'FDE9E7',total:'DDF2E4',totalfg:'215E36'};
  const edge=(color=C.grid,style='thin')=>({style,color:{rgb:color}});
  const borders=(color=C.grid)=>({top:edge(color),bottom:edge(color),left:edge(color),right:edge(color)});
  const style=(fill,fontColor=C.text,bold=false,align='left',wrap=false,sz=10,borderColor=C.grid)=>({
    fill:{patternType:'solid',fgColor:{rgb:fill}},
    font:{name:'Aptos',sz,bold,color:{rgb:fontColor}},
    alignment:{horizontal:align,vertical:'center',wrapText:wrap},
    border:borders(borderColor)
  });
  const addr=(r,c)=>XLSX.utils.encode_cell({r,c});
  const setStyle=(r,c,st)=>{const a=addr(r,c);if(ws[a]) ws[a].s=st;};
  const setRange=(r1,c1,r2,c2,st)=>{for(let r=r1;r<=r2;r++)for(let c=c1;c<=c2;c++)setStyle(r,c,st);};

  // Title and information cards.
  setRange(0,0,0,6,style(C.navy,C.white,true,'left',false,18,C.navy));
  setRange(1,0,4,0,style(C.navy2,C.white,true,'left',true,10));
  setRange(1,1,4,6,style(C.pale,C.text,false,'left',true,10));
  setStyle(2,0,style(C.gold,'3B2B00',true,'left',true,10));
  setStyle(2,1,style('FFF2CC','7F6000',true,'center',false,12));

  // Start matrix.
  setRange(6,0,6,6,style(C.navy,C.white,true,'left',false,13,C.navy));
  setRange(7,0,7,6,style(C.navy2,C.white,true,'center',true,10));
  const lineStyles=[['A',C.a,C.al],['B',C.b,C.bl],['C',C.c,C.cl],['D',C.d,C.dl]];
  for(let i=0;i<4;i++){
    const r=8+i, ls=lineStyles[i];
    setStyle(r,0,style(ls[1],C.white,true,'center',false,11));
    setRange(r,1,r,6,style(ls[2],C.text,false,'center',true,10));
    for(let c=1;c<=6;c++){
      const a=addr(r,c); if(ws[a] && ws[a].v==='MISSING DATE/TIME') ws[a].s=style(C.warnbg,C.warn,true,'center',true,10);
    }
  }

  // Quick view.
  setRange(quickTitleIdx,0,quickTitleIdx,6,style(C.navy,C.white,true,'left',false,13,C.navy));
  const qfills=[C.navy,C.teal,'0E7490',C.a,C.b,C.c,C.d];
  for(let c=0;c<7;c++) setStyle(quickHeaderIdx,c,style(qfills[c],C.white,true,'center',true,10));
  for(let i=0;i<activeDaily.length;i++){
    const r=quickDataStartIdx+i, base=(i%2===0?C.white:C.alt);
    setRange(r,0,r,2,style(base,C.text,false,'right',false,10));
    setStyle(r,0,style(base,C.text,false,'center',false,10));
    setStyle(r,1,style(base,C.teal,true,'center',false,11));
    setStyle(r,2,style(base,C.text,true,'right',false,10));
    setStyle(r,3,style(C.al,C.text,false,'right',false,10));
    setStyle(r,4,style(C.bl,C.text,false,'right',false,10));
    setStyle(r,5,style(C.cl,C.text,false,'right',false,10));
    setStyle(r,6,style(C.dl,C.text,false,'right',false,10));
  }
  setRange(totalIdx,0,totalIdx,6,style(C.total,C.totalfg,true,'right',false,11,C.navy));
  setStyle(totalIdx,0,style(C.total,C.totalfg,true,'left',false,11,C.navy));
  setStyle(totalIdx,1,style(C.total,C.totalfg,true,'center',false,11,C.navy));

  // Detailed breakdown.
  setRange(breakdownTitleIdx,0,breakdownTitleIdx,6,style(C.navy,C.white,true,'left',false,13,C.navy));
  setStyle(breakdownHeaderIdx,0,style(C.navy,C.white,true,'center',true,10));
  setStyle(breakdownHeaderIdx,1,style(C.teal,C.white,true,'center',true,10));
  setStyle(breakdownHeaderIdx,2,style('0E7490',C.white,true,'center',true,10));
  setStyle(breakdownHeaderIdx,3,style(C.a,C.white,true,'left',true,10));
  setStyle(breakdownHeaderIdx,4,style(C.b,C.white,true,'left',true,10));
  setStyle(breakdownHeaderIdx,5,style(C.c,C.white,true,'left',true,10));
  setStyle(breakdownHeaderIdx,6,style(C.d,C.white,true,'left',true,10));
  ws['!rows']=ws['!rows']||[];
  ws['!rows'][0]={hpt:30}; ws['!rows'][2]={hpt:24}; ws['!rows'][3]={hpt:34}; ws['!rows'][4]={hpt:42};
  ws['!rows'][6]={hpt:24}; ws['!rows'][7]={hpt:22};
  for(let r=8;r<=11;r++) ws['!rows'][r]={hpt:30};
  ws['!rows'][quickTitleIdx]={hpt:24}; ws['!rows'][quickHeaderIdx]={hpt:28};
  for(let r=quickDataStartIdx;r<totalIdx;r++) ws['!rows'][r]={hpt:22};
  ws['!rows'][totalIdx]={hpt:24}; ws['!rows'][breakdownTitleIdx]={hpt:24}; ws['!rows'][breakdownHeaderIdx]={hpt:25};

  let rr=detailStartRow;
  for(let i=0;i<sortedGroups.length;i++){
    const g=sortedGroups[i], base=(i%2===0?C.white:C.alt);
    setStyle(rr,0,style(base,C.text,true,'center',false,9));
    setStyle(rr,1,style(base,C.teal,true,'center',false,10));
    setStyle(rr,2,style(base,C.text,true,'right',false,9));
    setStyle(rr,3,style(C.al,C.text,false,'left',true,9,C.a));
    setStyle(rr,4,style(C.bl,C.text,false,'left',true,9,C.b));
    setStyle(rr,5,style(C.cl,C.text,false,'left',true,9,C.c));
    setStyle(rr,6,style(C.dl,C.text,false,'left',true,9,C.d));
    const maxRuns=Math.max(1,...['A','B','C','D'].map(line=>g.lines[line].length));
    ws['!rows'][rr]={hpt:Math.min(160,Math.max(26,12*(maxRuns+1)+4))};
    const b=addr(rr,1),c=addr(rr,2); if(ws[b])ws[b].z='0'; if(ws[c])ws[c].z='#,##0.00';
    rr++;
  }
  setRange(detailTotalIdx,0,detailTotalIdx,6,style(C.total,C.totalfg,true,'right',false,11,C.navy));
  setStyle(detailTotalIdx,0,style(C.total,C.totalfg,true,'left',false,11,C.navy));
  setStyle(detailTotalIdx,1,style(C.total,C.totalfg,true,'center',false,11,C.navy));
  setStyle(detailTotalIdx,3,style(C.total,C.totalfg,true,'center',false,10,C.navy));
  ws['!rows'][detailTotalIdx]={hpt:24};
  if(ws[addr(detailTotalIdx,1)]) ws[addr(detailTotalIdx,1)].z='0';
  if(ws[addr(detailTotalIdx,2)]) ws[addr(detailTotalIdx,2)].z='#,##0.00';

  // Number formats.
  for(let i=0;i<activeDaily.length;i++){
    const r=quickDataStartIdx+i;
    const b=addr(r,1), c=addr(r,2); if(ws[b]) ws[b].z='0'; if(ws[c]) ws[c].z='#,##0.00';
    for(let cc=3;cc<=6;cc++){const a=addr(r,cc);if(ws[a])ws[a].z='#,##0.00';}
  }
  if(ws[addr(totalIdx,1)]) ws[addr(totalIdx,1)].z='0';
  if(ws[addr(totalIdx,2)]) ws[addr(totalIdx,2)].z='#,##0.000';
  ws['!margins']={left:0.25,right:0.25,top:0.4,bottom:0.4,header:0.2,footer:0.2};
  XLSX.utils.book_append_sheet(wb,ws,'Cream Usage Breakdown');

  // Row-level audit sheet with professional filtering layout.
  const callout=[['Date','Line','Item','Schedule','From','To','Cases in 24h Span','Normal Cream lb','Callout']];
  for(const r of S.dailyAudit){
    callout.push([shortDate(r.date),r.line,r.code,r.schedule,timeOnly(r.segmentStart),timeOnly(r.segmentEnd),r.dailyCases,r.dailyCream,
      `${r.code} | ${r.schedule} | ${timeOnly(r.segmentStart)}–${timeOnly(r.segmentEnd)} | ${fmtNum(r.dailyCases,0)} Cases (${fmtNum(r.dailyCream,0)} lb Cream)`]);
  }
  const wsCall=XLSX.utils.aoa_to_sheet(callout);
  wsCall['!cols']=[{wch:12},{wch:7},{wch:12},{wch:10},{wch:11},{wch:11},{wch:17},{wch:16},{wch:68}];
  wsCall['!autofilter']={ref:`A1:I${callout.length}`};
  for(let c=0;c<9;c++){const a=XLSX.utils.encode_cell({r:0,c});if(wsCall[a])wsCall[a].s=style(C.navy,C.white,true,'center',true,10);}
  for(let r=1;r<callout.length;r++){
    const fill=(r%2?C.white:C.pale);
    for(let c=0;c<9;c++){const a=XLSX.utils.encode_cell({r,c});if(wsCall[a])wsCall[a].s=style(fill,C.text,false,c===8?'left':'center',c===8,9);}
    const g=XLSX.utils.encode_cell({r,c:6}),h=XLSX.utils.encode_cell({r,c:7}); if(wsCall[g])wsCall[g].z='#,##0';if(wsCall[h])wsCall[h].z='#,##0.00';
  }
  XLSX.utils.book_append_sheet(wb,wsCall,'Cream Usage Callout Detail');

  const ref=[
    ['CREAM USAGE BREAKDOWN — REFERENCE'],
    ['Table 1','Quick daily view: Date, Tankers Required, Total Normal Cream, and configured production-line Normal Cream totals.'],
    ['Table 2','Repeats Date, Tankers Required, and Total Normal Cream, then shows production-line run detail: Item | Schedule | From–To | Cases in that calendar-day portion (Cream lb).'],
    ['Calendar Day','12:00 AM through the next 12:00 AM.'],
    ['Cross-Midnight Allocation','Cases and Normal Cream are allocated proportionally by the actual minutes of the run that fall within each calendar date.'],
    ['Normal Cream','Organic Cream is excluded from this file\'s Normal Cream totals.'],
    ['Cream Requirement','Cream/Case × Cases × configured waste factor.'],
    ['Page 1 Tanker Requirement','Page 1 is a volume-equivalent quick view. Unused equivalent capacity carries forward across dates for the quick calculation.'],
    ['Page 2 Physical Tanker Rule',`Normal Cream is consumed continuously from Start through Finish at each destination. When projected site balance reaches zero, another whole tanker is assigned. ${cfgRequiredByLabel()} = projected site need/shortage time minus the configured receiving lead time. Internal transfer is within that lead-time window. Tankers cannot be split between sites; excess stays at the assigned site.`],
    ['Unused Schedules','A missing S1 Start Date/Time is informational if the schedule is unused.'],
    ['Active Timing Error','A production row with Cases > 0 blocks only when Start/Finish is blank or invalid, or Finish is not later than Start. A valid 12:00 AM timestamp is accepted.']
  ];
  const wsRef=XLSX.utils.aoa_to_sheet(ref); wsRef['!cols']=[{wch:24},{wch:78}]; wsRef['!merges']=[XLSX.utils.decode_range('A1:B1')];
  for(let c=0;c<2;c++){const a=XLSX.utils.encode_cell({r:0,c});if(wsRef[a])wsRef[a].s=style(C.navy,C.white,true,'left',false,16,C.navy);}
  for(let r=1;r<ref.length;r++){
    const a=XLSX.utils.encode_cell({r,c:0}),b=XLSX.utils.encode_cell({r,c:1});
    if(wsRef[a])wsRef[a].s=style(C.navy2,C.white,true,'left',true,10);
    if(wsRef[b])wsRef[b].s=style(r%2?C.white:C.pale,C.text,false,'left',true,10);
  }
  XLSX.utils.book_append_sheet(wb,wsRef,'Reference');

  const base=(S.scheduleName||'Schedule').replace(/\.(xlsx|xlsm|xls)$/i,'').replace(/[^A-Za-z0-9._ -]+/g,'_');
  XLSX.writeFile(wb,`${base}_Cream_Usage_Breakdown.xlsx`,{cellStyles:true});
}

function appendPage1MainSheet(outWB){
  if(!S.scheduleWB||S.blocked) return;
  const start=scheduleStartMatrix(),tk=dailyTankerRequirements();
  const normalTotal=S.daily.reduce((sum,x)=>sum+x.Standard,0);
  const volumeTankers=Math.ceil((normalTotal-1e-8)/tankerSize('Standard'));
  const groups=new Map();
  for(const r of S.dailyAudit){
    const k=dayKey(r.date);
    if(!groups.has(k))groups.set(k,{date:r.date,lines:{A:[],B:[],C:[],D:[]},lineTotals:{A:0,B:0,C:0,D:0}});
    const g=groups.get(k);g.lines[r.line].push(r);g.lineTotals[r.line]+=r.dailyCream;
  }
  for(const g of groups.values())for(const line of ['A','B','C','D'])g.lines[line].sort((a,b)=>a.segmentStart-b.segmentStart||a.schedule.localeCompare(b.schedule));
  const activeDaily=S.daily.filter(x=>x.Standard>0.0001);
  const rows=[
    ['PAGE 1 — CREAM USAGE BREAKDOWN'],
    ['Schedule File',S.scheduleName||''],
    ['Milk Tanker Size - 1 Tanker (lb)',tankerSize('Standard')],
    ['Page 1 Tanker Rule','Volume-equivalent quick view only. Page 2 contains the physical whole-tanker site allocation.'],
    ['24-Hour Rule','Each date is 12:00 AM through the next 12:00 AM. Cross-midnight runs are split by actual Start/Finish overlap.'],
    [],['SCHEDULE START DATE & TIME — 1A THROUGH 6D'],['Line / Schedule','1','2','3','4','5','6']
  ];
  for(const r of start)rows.push([r.line,...r.values.map(x=>x.valid?dt(x.date):'MISSING DATE/TIME')]);
  rows.push([]);const qTitle=rows.length;rows.push(['TABLE 1 — DAILY CREAM QUICK VIEW']);const qHead=rows.length;rows.push(['Date','Tankers Required','Total Normal Cream','A Line','B Line','C Line','D Line']);const qStart=rows.length;
  for(const x of activeDaily)rows.push([shortDate(x.date),tk.get(dayKey(x.date))||0,x.Standard,x.AStandard,x.BStandard,x.CStandard,x.DStandard]);
  const qTotal=rows.length;rows.push(['TOTAL',volumeTankers,normalTotal]);
  rows.push([]);const dTitle=rows.length;rows.push(['TABLE 2 — DAILY LINE RUN BREAKDOWN']);const dHead=rows.length;rows.push(['Date','Tankers Required','Total Normal Cream','A Line — Run Breakdown','B Line — Run Breakdown','C Line — Run Breakdown','D Line — Run Breakdown']);const dStart=rows.length;
  const sorted=[...groups.values()].sort((a,b)=>a.date-b.date);
  for(const g of sorted){
    const lineText=line=>{const parts=[`${line} Line Total: ${fmtNum(g.lineTotals[line],2)} lb`];for(const r of g.lines[line])parts.push(`${r.code} | ${r.schedule} | ${timeOnly(r.segmentStart)}–${timeOnly(r.segmentEnd)} | ${fmtNum(r.dailyCases,0)} Cases (${fmtNum(r.dailyCream,0)} lb Cream)`);if(!g.lines[line].length)parts.push('No Normal Cream run');return parts.join('\n');};
    const dayTotal=['A','B','C','D'].reduce((sum,line)=>sum+g.lineTotals[line],0);
    rows.push([shortDate(g.date),tk.get(dayKey(g.date))||0,dayTotal,lineText('A'),lineText('B'),lineText('C'),lineText('D')]);
  }
  const dTotal=rows.length;rows.push(['TOTAL',volumeTankers,normalTotal,'END OF PAGE 1 — VOLUME-EQUIVALENT TANKERS & NORMAL CREAM','','','']);
  const ws=XLSX.utils.aoa_to_sheet(rows);
  ws['!cols']=[{wch:11},{wch:14},{wch:17},{wch:46},{wch:46},{wch:46},{wch:46}];
  ws['!merges']=[XLSX.utils.decode_range('A1:G1'),XLSX.utils.decode_range('B2:G2'),XLSX.utils.decode_range('B4:G4'),XLSX.utils.decode_range('B5:G5'),XLSX.utils.decode_range('A7:G7'),XLSX.utils.decode_range(`A${qTitle+1}:G${qTitle+1}`),XLSX.utils.decode_range(`A${dTitle+1}:G${dTitle+1}`),XLSX.utils.decode_range(`D${dTotal+1}:G${dTotal+1}`)];
  const C={navy:'163A5F',navy2:'245A85',text:'17324D',grid:'B9C8D8',white:'FFFFFF',pale:'F5F8FC',alt:'ECF3F9',a:'2E75B6',al:'EAF3FB',b:'548A64',bl:'EDF6F0',c:'B67A22',cl:'FFF5E3',d:'754A91',dl:'F4ECF8',teal:'1F7A8C',gold:'D9A441',warn:'B42318',warnbg:'FDE9E7',total:'DDF2E4',totalfg:'215E36'};
  const edge=(color=C.grid,style='thin')=>({style,color:{rgb:color}});const borders=(color=C.grid)=>({top:edge(color),bottom:edge(color),left:edge(color),right:edge(color)});const sty=(fill,fontColor=C.text,bold=false,align='left',wrap=false,sz=10,borderColor=C.grid)=>({fill:{patternType:'solid',fgColor:{rgb:fill}},font:{name:'Aptos',sz,bold,color:{rgb:fontColor}},alignment:{horizontal:align,vertical:'center',wrapText:wrap},border:borders(borderColor)});const addr=(r,c)=>XLSX.utils.encode_cell({r,c});const set=(r,c,st)=>{const x=addr(r,c);if(ws[x])ws[x].s=st};const setR=(r1,c1,r2,c2,st)=>{for(let r=r1;r<=r2;r++)for(let c=c1;c<=c2;c++)set(r,c,st)};
  setR(0,0,0,6,sty(C.navy,C.white,true,'left',false,18,C.navy));setR(1,0,4,0,sty(C.navy2,C.white,true,'left',true,10));setR(1,1,4,6,sty(C.pale,C.text,false,'left',true,10));set(2,0,sty(C.gold,'3B2B00',true));set(2,1,sty('FFF2CC','7F6000',true,'center',false,12));
  setR(6,0,6,6,sty(C.navy,C.white,true,'left',false,13,C.navy));setR(7,0,7,6,sty(C.navy2,C.white,true,'center',true,10));const ls=[[C.a,C.al],[C.b,C.bl],[C.c,C.cl],[C.d,C.dl]];for(let i=0;i<4;i++){const r=8+i;set(r,0,sty(ls[i][0],C.white,true,'center',false,11));setR(r,1,r,6,sty(ls[i][1],C.text,false,'center',true,10));for(let c=1;c<=6;c++){const x=addr(r,c);if(ws[x]&&ws[x].v==='MISSING DATE/TIME')ws[x].s=sty(C.warnbg,C.warn,true,'center',true,10)}}
  setR(qTitle,0,qTitle,6,sty(C.navy,C.white,true,'left',false,13,C.navy));const hf=[C.navy,C.teal,'0E7490',C.a,C.b,C.c,C.d];for(let c=0;c<7;c++)set(qHead,c,sty(hf[c],C.white,true,'center',true,10));for(let i=0;i<activeDaily.length;i++){const r=qStart+i,base=i%2?C.alt:C.white;setR(r,0,r,2,sty(base,C.text,false,'right'));set(r,0,sty(base,C.text,false,'center'));set(r,1,sty(base,C.teal,true,'center'));set(r,2,sty(base,C.text,true,'right'));[C.al,C.bl,C.cl,C.dl].forEach((f,j)=>set(r,3+j,sty(f,C.text,false,'right')))}setR(qTotal,0,qTotal,6,sty(C.total,C.totalfg,true,'right',false,11,C.navy));set(qTotal,0,sty(C.total,C.totalfg,true,'left',false,11,C.navy));set(qTotal,1,sty(C.total,C.totalfg,true,'center',false,11,C.navy));
  setR(dTitle,0,dTitle,6,sty(C.navy,C.white,true,'left',false,13,C.navy));[C.navy,C.teal,'0E7490',C.a,C.b,C.c,C.d].forEach((f,c)=>set(dHead,c,sty(f,C.white,true,c<3?'center':'left',true,10)));ws['!rows']=ws['!rows']||[];let rr=dStart;for(let i=0;i<sorted.length;i++,rr++){const g=sorted[i],base=i%2?C.alt:C.white;set(rr,0,sty(base,C.text,true,'center',false,9));set(rr,1,sty(base,C.teal,true,'center'));set(rr,2,sty(base,C.text,true,'right',false,9));set(rr,3,sty(C.al,C.text,false,'left',true,9,C.a));set(rr,4,sty(C.bl,C.text,false,'left',true,9,C.b));set(rr,5,sty(C.cl,C.text,false,'left',true,9,C.c));set(rr,6,sty(C.dl,C.text,false,'left',true,9,C.d));const maxRuns=Math.max(1,...['A','B','C','D'].map(line=>g.lines[line].length));ws['!rows'][rr]={hpt:Math.min(160,Math.max(26,12*(maxRuns+1)+4))};if(ws[addr(rr,1)])ws[addr(rr,1)].z='0';if(ws[addr(rr,2)])ws[addr(rr,2)].z='#,##0.00'}
  setR(dTotal,0,dTotal,6,sty(C.total,C.totalfg,true,'right',false,11,C.navy));set(dTotal,0,sty(C.total,C.totalfg,true,'left',false,11,C.navy));set(dTotal,1,sty(C.total,C.totalfg,true,'center',false,11,C.navy));set(dTotal,3,sty(C.total,C.totalfg,true,'center',false,10,C.navy));if(ws[addr(dTotal,1)])ws[addr(dTotal,1)].z='0';if(ws[addr(dTotal,2)])ws[addr(dTotal,2)].z='#,##0.00';ws['!margins']={left:0.25,right:0.25,top:0.4,bottom:0.4,header:0.2,footer:0.2};
  XLSX.utils.book_append_sheet(outWB,ws,'Page 1 - Cream Usage');
}

function downloadPlanAndErrors(){
  if(!S.scheduleWB) return;

  const wb=XLSX.utils.book_new();
  appendPage1MainSheet(wb);

  const validRuns=S.runs.filter(r=>Number.isFinite(r.cream));
  const total=validRuns.reduce((s,r)=>s+r.cream,0);
  const byType=t=>validRuns.filter(r=>r.type===t).reduce((s,r)=>s+r.cream,0);
  const earliestProd=validRuns.length?new Date(Math.min(...validRuns.map(r=>+r.start))):null;
  const earliestReceipt=S.tankers.length?new Date(Math.min(...S.tankers.map(t=>+t.receive))):null;

  const summaryRows=[
    [`${CONFIG.app.title} — Export`],
    ['Schedule File',S.scheduleName||''],
    ['External Master File',S.masterName||'(none — embedded schedule master used)'],
    ['BOM File',S.bomName||'(none — Raw Cream text fallback used)'],
    ['Inventory File',S.ohName||'(none — component descriptions unavailable)'],
    [`${cfgReceivingPoint()} Lead Time (hours before production start)`,leadHours()],
    ['Standard Tanker Size (lb)',tankerSize('Standard')],
    ['Organic Tanker Size (lb)',tankerSize('Organic')],
    ['Additional Waste (%)',Number($('wastePct').value)||0],
    ['Usage Timing Model',$('timingModel').options[$('timingModel').selectedIndex].text],
    ['Schedule Timing Preflight',S.blocked?'BLOCKED — fix Date/Time before analysis':'PASS'],
    ['NORMAL Cream Milk (lb) — Organic excluded',Math.round(byType('Standard'))],
    ['Page 1 Volume-Equivalent Tankers',Math.ceil((byType('Standard')-1e-8)/tankerSize('Standard'))],
    ['Page 2 Physical Whole Tankers',S.tankers.filter(t=>t.type==='Standard').length],
    ...(CONFIG.schedule.siteKeys||[]).flatMap(site=>[
      [`${cfgSiteLabel(site)} — Tankers`,S.siteSummary[site]?.tankers||0],
      [`${cfgSiteLabel(site)} — Ending Cream lb`,Math.round(S.siteSummary[site]?.ending||0)]
    ]),
    ['Organic Cream Milk (lb) — SEPARATE',Math.round(byType('Organic'))],
    ['All Cream Milk Reference (Normal + Organic) lb',Math.round(total)],
    ['Earliest Production',earliestProd?dt(earliestProd):''],
    ['Earliest D Receipt',earliestReceipt?dt(earliestReceipt):''],
    ['Error Count',S.issues.filter(x=>x.level==='error').length],
    ['Warning Count',S.issues.filter(x=>x.level==='warn').length],
    ['Explicit N/A Cream Rows Treated as 0',S.zeroCream.length],
    ['Export Note','COMPLETE HANDOFF FILE: Page 1 Cream Usage is included first, followed by the Page 2 physical whole-tanker plan, site balances, analysis, errors, and every loaded input workbook/sheet. Each tanker must be at ${cfgReceivingPoint()} by the projected continuous site need/shortage time minus the configured lead time; internal transfer has no additional buffer. Current opening Normal Cream is 0 lb at all configured destination sites; prior/in-transit tankers are reserved for a future version.']
  ];
  const wsSummary=XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols']=[{wch:34},{wch:70}];
  XLSX.utils.book_append_sheet(wb,wsSummary,'Summary');

  const dailyRows=[
    ['Date','A Normal lb','B Normal lb','C Normal lb','D Normal lb','NORMAL Cream Total lb'],
    ...S.daily.map(x=>[
      shortDate(x.date),Math.round(x.AStandard),Math.round(x.BStandard),Math.round(x.CStandard),Math.round(x.DStandard),Math.round(x.Standard)
    ])
  ];
  const wsDaily=XLSX.utils.aoa_to_sheet(dailyRows);
  wsDaily['!cols']=[{wch:14},{wch:16},{wch:16},{wch:16},{wch:16},{wch:22}];
  XLSX.utils.book_append_sheet(wb,wsDaily,'Normal Cream Milk Daily');

  const dailyAuditExportRows=[['Date','Row Type','Daily Total Normal Cream lb','Schedule','Line','Item','Description','Scheduled Cases','Segment From','Segment To','Cases in 24h Span','Cream/Case','Item Cream incl Waste lb','Daily Allocated Cream lb','Share of Item']];
  const dailyAuditGroups=new Map();
  for(const r of S.dailyAudit){
    const k=dayKey(r.date);if(!dailyAuditGroups.has(k))dailyAuditGroups.set(k,{date:r.date,rows:[],total:0});
    const g=dailyAuditGroups.get(k);g.rows.push(r);g.total+=r.dailyCream;
  }
  for(const g of [...dailyAuditGroups.values()].sort((a,b)=>a.date-b.date)){
    dailyAuditExportRows.push([shortDate(g.date),'DATE TOTAL',Math.round(g.total),'','','','','','','','','','','']);
    for(const r of g.rows){
      dailyAuditExportRows.push([shortDate(g.date),'DETAIL','',r.schedule,r.line,r.code,r.desc||'',r.cases,timeOnly(r.segmentStart),timeOnly(r.segmentEnd),Math.round(r.dailyCases),r.factor,Math.round(r.itemCream),Math.round(r.dailyCream),r.share]);
    }
  }
  const wsDailyAudit=XLSX.utils.aoa_to_sheet(dailyAuditExportRows);
  wsDailyAudit['!cols']=[{wch:14},{wch:13},{wch:26},{wch:11},{wch:8},{wch:14},{wch:48},{wch:11},{wch:23},{wch:23},{wch:14},{wch:24},{wch:26},{wch:14}];
  XLSX.utils.book_append_sheet(wb,wsDailyAudit,'Daily Cream Audit');

  const orgDaily=[
    ['Date','A Organic lb','B Organic lb','C Organic lb','D Organic lb','Organic Total lb'],
    ...S.daily.filter(x=>x.Organic>0.0001).map(x=>[
      shortDate(x.date),Math.round(x.AOrganic),Math.round(x.BOrganic),Math.round(x.COrganic),Math.round(x.DOrganic),Math.round(x.Organic)
    ])
  ];
  const wsOrgDaily=XLSX.utils.aoa_to_sheet(orgDaily);
  wsOrgDaily['!cols']=[{wch:14},{wch:18},{wch:18},{wch:18},{wch:18},{wch:20}];
  XLSX.utils.book_append_sheet(wb,wsOrgDaily,'Organic Cream Milk');

  const physicalRows=[
    ['Dispatch Priority',cfgRequiredByLabel(),'Needed at Site Around','Destination Site','Site Tanker #','Tanker Size lb','Active Production at Need Time','Site Use Rate lb/hr','Cumulative Site Cream Used lb','Balance Before Delivery lb','Balance After Delivery lb'],
    ...S.tankers.filter(t=>t.type==='Standard').sort((a,b)=>a.receive-b.receive).map(t=>[
      t.no,dt(t.receive),dt(t.neededAtSite||t.trigger),cfgSiteLabel(t.dest),t.siteNo,Math.round(t.size),t.activeText||'',Math.round(t.siteUseRate||0),Math.round(t.cumulativeUsed||0),Math.round(t.balanceBeforeDelivery||0),Math.round(t.balanceAfterDelivery||0)
    ])
  ];
  const wsPhysical=XLSX.utils.aoa_to_sheet(physicalRows);
  wsPhysical['!cols']=[{wch:14},{wch:24},{wch:24},{wch:18},{wch:14},{wch:16},{wch:46},{wch:18},{wch:25},{wch:24},{wch:23}];
  XLSX.utils.book_append_sheet(wb,wsPhysical,'Physical Tanker Dispatch');

  const ledgerRows=[['Site','Start / Time','End','Event','Active Production','Change lb','Running Site Balance lb','Note']];
  for(const site of (CONFIG.schedule.siteKeys||[])){
    for(const r of (S.siteLedgers[site]||[])) ledgerRows.push([site,r.time?dt(r.time):'Opening',r.timeEnd?dt(r.timeEnd):'',r.event,r.activeText||'',Math.round(r.change||0),Math.round(r.balance||0),r.note||'']);
  }
  const wsLedger=XLSX.utils.aoa_to_sheet(ledgerRows);
  wsLedger['!cols']=[{wch:12},{wch:24},{wch:24},{wch:18},{wch:52},{wch:16},{wch:24},{wch:62}];
  XLSX.utils.book_append_sheet(wb,wsLedger,'Site Balance Ledger');

  const orgTankerRows=[
    ['Must Be at D By','Tanker #','Tanker Size lb','Scheduled Demand Covered lb','Destinations Covered','Cream Needed / Trigger','Covers Through'],
    ...S.tankers.filter(t=>t.type==='Organic').map(t=>[dt(t.receive),t.no,Math.round(t.size),Math.round(t.planned),t.coverageDestinations||'',dt(t.trigger),dt(t.coverageEnd)])
  ];
  const wsOrgTank=XLSX.utils.aoa_to_sheet(orgTankerRows);
  wsOrgTank['!cols']=[{wch:24},{wch:10},{wch:18},{wch:27},{wch:26},{wch:25},{wch:25}];
  XLSX.utils.book_append_sheet(wb,wsOrgTank,'Organic Cream Milk Tanker Plan');

  const daySummaryRows=[[`${cfgReceivingPoint()} Deadline Date`,'Normal Cream Used That Production Day lb',`Physical Whole Tankers Required at ${cfgReceivingPoint()}`,`${cfgReceivingPoint()} Deadline / Destination`]];
  const tkByDate=new Map();
  for(const t of S.tankers.filter(t=>t.type==='Standard')){
    const k=dayKey(t.receive);if(!tkByDate.has(k))tkByDate.set(k,[]);tkByDate.get(k).push(t);
  }
  const dateKeys=new Set([...S.daily.map(x=>dayKey(x.date)),...tkByDate.keys()]);
  for(const k of [...dateKeys].sort()){
    const x=S.daily.find(d=>dayKey(d.date)===k);
    const loads=(tkByDate.get(k)||[]).sort((a,b)=>a.receive-b.receive);
    daySummaryRows.push([k,Math.round(x?x.Standard:0),loads.length,loads.map(t=>`T${t.no}→${cfgSiteLabel(t.dest)} ${dt(t.receive)}`).join(' | ')]);
  }
  const wsDaySummary=XLSX.utils.aoa_to_sheet(daySummaryRows);
  wsDaySummary['!cols']=[{wch:20},{wch:34},{wch:30},{wch:110}];
  XLSX.utils.book_append_sheet(wb,wsDaySummary,'Physical Tanker Day Timeline');

  const errorRows=[
    ['Level','Message'],
    ...(S.issues.length?S.issues.map(i=>[String(i.level||'').toUpperCase(),i.msg]):[['OK','No errors or warnings found.']])
  ];
  const wsErrors=XLSX.utils.aoa_to_sheet(errorRows);
  wsErrors['!cols']=[{wch:12},{wch:110}];
  XLSX.utils.book_append_sheet(wb,wsErrors,'Errors');

  const auditRows=[
    ['Item','Description','Raw Cream Cell','Cream Type','Classification Method','Classification Evidence','Scheduled Cases','Cream lb incl. Waste'],
    ...S.runs.map(r=>[
      r.code,r.desc||'',r.rawCreamValue??'',r.type,r.classificationMethod||'',r.classificationEvidence||'',
      Number.isFinite(r.cases)?r.cases:'',
      Number.isFinite(r.cream)?Math.round(r.cream):'MISSING'
    ])
  ];
  const wsAudit=XLSX.utils.aoa_to_sheet(auditRows);
  wsAudit['!cols']=[{wch:14},{wch:48},{wch:26},{wch:14},{wch:22},{wch:60},{wch:16},{wch:22}];
  XLSX.utils.book_append_sheet(wb,wsAudit,'Cream Type Audit');

  const zeroRows=[
    ['Schedule','Line','Item','Description','Rule'],
    ...(S.zeroCream.length?S.zeroCream.map(z=>[z.schedule,z.line,z.code,z.desc,z.reason]):[['','','','','No explicit N/A cream rows found.']])
  ];
  const wsZero=XLSX.utils.aoa_to_sheet(zeroRows);
  wsZero['!cols']=[{wch:12},{wch:8},{wch:14},{wch:52},{wch:52}];
  XLSX.utils.book_append_sheet(wb,wsZero,'Zero Cream Items');

  const detailRows=[
    ['Start','Finish','Schedule','Line','Destination Pool','Item','Description','Formula','Cases','Raw Cream Cell','Cream/Case','Cream Type','Classification Evidence','Total Cream incl. Waste lb','Factor Source'],
    ...S.runs.map(r=>[
      dt(r.start),dt(r.finish),r.schedule,r.line,r.dest,r.code,r.desc||'',r.formula||'',
      Number.isFinite(r.cases)?r.cases:'',
      r.rawCreamValue??'',
      Number.isFinite(r.factor)?r.factor:'MISSING',
      r.type,
      r.classificationEvidence||'',
      Number.isFinite(r.cream)?Math.round(r.cream):'MISSING',
      r.source
    ])
  ];
  const wsDetail=XLSX.utils.aoa_to_sheet(detailRows);
  wsDetail['!cols']=[
    {wch:22},{wch:22},{wch:10},{wch:8},{wch:24},{wch:14},{wch:40},
    {wch:24},{wch:12},{wch:24},{wch:14},{wch:14},{wch:26},{wch:18}
  ];
  XLSX.utils.book_append_sheet(wb,wsDetail,'Item Detail');

  // Complete handoff archive: every loaded input workbook and every input sheet.
  // This lets the exported Excel stand alone for review/troubleshooting.
  const usedNames=new Set(wb.SheetNames.map(n=>n.toUpperCase()));
  const manifestRows=[
    ['Input Role','Source File','Original Sheet','Archive Sheet','Original Range','Rows Archived','Max Columns']
  ];
  appendInputWorkbookArchive(wb,S.scheduleWB,'Schedule',S.scheduleName,'IN_SCH',usedNames,manifestRows);
  appendInputWorkbookArchive(wb,S.masterWB,'External Master',S.masterName,'IN_MST',usedNames,manifestRows);
  appendInputWorkbookArchive(wb,S.bomWB,'BOM / Bill Detail',S.bomName,'IN_BOM',usedNames,manifestRows);
  appendInputWorkbookArchive(wb,S.ohWB,'Inventory',S.ohName,'IN_OH',usedNames,manifestRows);

  const wsManifest=XLSX.utils.aoa_to_sheet(manifestRows);
  wsManifest['!cols']=[{wch:22},{wch:42},{wch:28},{wch:31},{wch:18},{wch:16},{wch:14}];
  XLSX.utils.book_append_sheet(wb,wsManifest,'Input Manifest');

  const safe=(S.scheduleName||'Schedule').replace(/\.[^.]+$/,'').replace(/[\\/:*?"<>|]+/g,'_');
  XLSX.writeFile(wb,`${CONFIG.app.outputPrefix}_Page2_Extract_With_Page1_${safe}.xlsx`);
}

$('downloadPlanErrorsBtn').addEventListener('click',downloadPlanAndErrors);
renderAll();
