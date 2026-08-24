
(function(){
  const DEMO_STARTS={
    '1A':new Date(2026,0,12,6,0),'2A':new Date(2026,0,13,18,0),'3A':new Date(2026,0,15,7,0),
    '1B':new Date(2026,0,12,7,0),'2B':new Date(2026,0,14,6,0),'3B':new Date(2026,0,15,19,0),
    '1C':new Date(2026,0,12,15,0),'2C':new Date(2026,0,14,9,0),
    '1D':new Date(2026,0,13,5,0),'2D':new Date(2026,0,14,17,0),'3D':new Date(2026,0,15,17,0)
  };
  const specs=[
    ['1A','A','SKU-0001','Standard Whipped Product',5200,new Date(2026,0,12,6,0),new Date(2026,0,12,12,30),4.40,'Standard'],
    ['1A','A','SKU-0002','Standard Whipped Product',4300,new Date(2026,0,12,12,30),new Date(2026,0,12,18,0),4.85,'Standard'],
    ['1B','B','SKU-0003','Standard Whipped Product',7800,new Date(2026,0,12,7,0),new Date(2026,0,12,19,0),4.10,'Standard'],
    ['1C','C','SKU-0101','Standard Specialty Product',6900,new Date(2026,0,12,15,0),new Date(2026,0,13,1,30),4.60,'Standard'],
    ['1D','D','SKU-0201','Standard Club Product',8200,new Date(2026,0,13,5,0),new Date(2026,0,13,17,0),5.10,'Standard'],
    ['2A','A','SKU-0004','Standard Whipped Product',6100,new Date(2026,0,13,18,0),new Date(2026,0,14,3,0),4.35,'Standard'],
    ['2B','B','SKU-0005','Standard Whipped Product',7600,new Date(2026,0,14,6,0),new Date(2026,0,14,17,30),4.55,'Standard'],
    ['2C','C','SKU-0102','Standard Specialty Product',7400,new Date(2026,0,14,9,0),new Date(2026,0,14,20,0),5.20,'Standard'],
    ['2D','D','SKU-0202','Standard Club Product',9200,new Date(2026,0,14,17,0),new Date(2026,0,15,6,0),4.95,'Standard'],
    ['3A','A','SKU-0006','Standard Whipped Product',4700,new Date(2026,0,15,7,0),new Date(2026,0,15,13,30),4.25,'Standard'],
    ['3B','B','SKU-0007','Standard Whipped Product',5100,new Date(2026,0,15,19,0),new Date(2026,0,16,2,0),4.70,'Standard'],
    ['3D','D','SKU-0203','Standard Club Product',6800,new Date(2026,0,15,17,0),new Date(2026,0,16,2,30),5.05,'Standard'],
    ['3D','D','SKU-0901','Organic Demonstration Product',3600,new Date(2026,0,16,3,0),new Date(2026,0,16,8,0),4.80,'Organic']
  ];
  function mockSchedule(){
    const Sheets={},SheetNames=[];
    for(const line of CONFIG.schedule.lineIds){for(const slot of CONFIG.schedule.slotNumbers){
      const name=`${slot}${line}`;SheetNames.push(name);Sheets[name]={};
      if(DEMO_STARTS[name])Sheets[name]['S1']={v:new Date(DEMO_STARTS[name])};
    }}
    return {SheetNames,Sheets};
  }
  function loadDemo(){
    S.demoMode=true;S.scheduleWB=mockSchedule();S.scheduleName='synthetic_schedule.csv';S.masterWB=null;S.bomWB=null;S.ohWB=null;
    S.issues=[];S.preflight=[];S.blocked=false;S.zeroCream=[];S.tankers=[];S.daily=[];S.dailyAudit=[];S.receiving=[];S.siteLedgers={};S.siteSummary={};
    S.runs=specs.map(([schedule,line,code,desc,cases,start,finish,factor,type])=>({
      schedule,line,code,desc,formula:type==='Organic'?'Product Family 5':'Product Family 1',cases,start:new Date(start),finish:new Date(finish),factor,
      cream:factor*cases*wasteFactor(),rawCreamValue:factor,type,classificationEvidence:type==='Organic'?'Synthetic BOM: MAT-CREAM-ORG':'Synthetic BOM: MAT-CREAM-STD',classificationMethod:'Synthetic demo configuration',dest:destForLine(line),source:'Synthetic Demo'
    })).sort((a,b)=>a.start-b.start||a.schedule.localeCompare(b.schedule));
    dailyCalc();buildDailyAudit();buildTankers();renderAll();
    const normal=S.runs.filter(r=>r.type==='Standard').reduce((s,r)=>s+r.cream,0);
    const eq=Math.ceil(normal/tankerSize('Standard')-1e-12);
    const physical=S.tankers.filter(t=>t.type==='Standard').length;
    const insight=document.getElementById('demoInsight');
    if(insight){insight.classList.add('show');insight.innerHTML=`<b>Decision insight:</b> aggregate Normal Cream demand equals <b>${eq} tanker-equivalent${eq===1?'':'s'}</b>, while the physical site plan requires <b>${physical} whole tankers</b>. The difference is caused by non-transferable leftover cream across separate sites. <b>Healthy condition:</b> when each listed deadline is met, every site balance remains non-negative.`}

    // Recruiter-facing executive snapshot. Uses the same calculated demo state; no duplicate business logic.
    const setText=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value};
    const stdTankers=S.tankers.filter(t=>t.type==='Standard').sort((a,b)=>a.receive-b.receive);
    const siteKeys=(CONFIG.schedule.siteKeys||[]);
    const counts=siteKeys.map(k=>S.siteSummary[k]?.tankers||0);
    const maxCount=Math.max(1,...counts);
    setText('pfNormal',fmtLb(normal));
    setText('pfEquivalent',`${eq} load${eq===1?'':'s'}`);
    setText('pfPhysical',`${physical} tanker${physical===1?'':'s'}`);
    setText('pfDeadline',stdTankers.length?dt(stdTankers[0].receive):'—');
    setText('pfAllocationTotal',`${physical} total`);
    setText('pfABCount',counts[0]??0);setText('pfCCount',counts[1]??0);setText('pfDCount',counts[2]??0);
    [['pfABBar',counts[0]||0],['pfCBar',counts[1]||0],['pfDBar',counts[2]||0]].forEach(([id,n])=>{const el=document.getElementById(id);if(el)el.style.width=`${Math.max(4,(n/maxCount)*100)}%`});
    const delta=physical-eq;
    const status=document.getElementById('pfStatus');
    if(status){status.classList.remove('live','risk');status.classList.add(delta>0?'risk':'live');status.textContent=delta>0?`Constraint detected • +${delta} physical load${delta===1?'':'s'}`:'Balanced physical plan'}
    setText('pfActionTitle',delta>0?'Site constraints create an extra physical load.':'Aggregate volume and physical loads align.');
    setText('pfActionText',delta>0?`The aggregate requirement suggests ${eq} loads, but non-transferable site balances require ${physical}. The dispatch plan protects each destination instead of letting leftover cream at one site mask a shortage at another.`:`All configured sites can be protected with the same number of physical loads implied by aggregate volume. The dispatch sequence still matters because every load has a destination and deadline.`);
    for(const id of ['breakScheduleFile','scheduleFile']){const el=document.getElementById(id);if(el)el.textContent='synthetic_schedule.csv · demo loaded'}
  }
  const btn=document.getElementById('loadDemoBtn');if(btn)btn.addEventListener('click',loadDemo);
  // Public demo runs without the spreadsheet library; keep production-only spreadsheet actions visibly disabled.
  for(const id of ['breakScheduleInput','scheduleInput','masterInput','bomInput','ohInput','breakDownloadBtn','downloadPlanErrorsBtn','downloadPlanBtn','downloadErrorsBtn']){
    const el=document.getElementById(id);if(el){el.disabled=true;el.classList.add('portfolio-disabled')}
  }
})();
