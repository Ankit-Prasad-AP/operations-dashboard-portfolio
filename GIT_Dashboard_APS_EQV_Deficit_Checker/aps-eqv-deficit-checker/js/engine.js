function parseDate(value){
  if(!value) return null;
  const normalized = String(value).replace(' ', 'T');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}
function dateOnly(value){
  const date = parseDate(value);
  if(!date) return '';
  return date.toLocaleDateString(undefined,{month:'short',day:'numeric'});
}
function formatNumber(value){ return Math.round(Number(value||0)).toLocaleString(); }
function equivalentCases(row){ return Number(row.rawDeficit||0) * Number(row.eqvFactor||1); }
function scheduledEquivalent(row){ return Number(row.scheduled||0) * Number(row.eqvFactor||1); }
function derivedStatus(row){
  const risk = parseDate(row.firstRisk);
  const run = parseDate(row.runDate);
  const eqv = equivalentCases(row);
  const scheduled = scheduledEquivalent(row);
  if(row.statusHint === 'REVIEW') return 'REVIEW';
  if(!run || scheduled < eqv) return 'NOT SAFE';
  return run <= risk ? 'SAFE' : 'NOT SAFE';
}
function enrichRows(rows){
  return rows.map(row => ({
    ...row,
    status: derivedStatus(row),
    eqvDeficit: equivalentCases(row),
    eqvScheduled: scheduledEquivalent(row)
  }));
}
function summarize(rows){
  const totalDeficit = rows.reduce((sum,row)=>sum+row.eqvDeficit,0);
  const totalScheduled = rows.reduce((sum,row)=>sum+row.eqvScheduled,0);
  const safe = rows.filter(row=>row.status==='SAFE');
  const review = rows.filter(row=>row.status==='REVIEW');
  const risk = rows.filter(row=>row.status==='NOT SAFE');
  const atRiskValue = risk.reduce((sum,row)=>sum+row.eqvDeficit,0);
  return { totalDeficit,totalScheduled,safeCount:safe.length,reviewCount:review.length,riskCount:risk.length,atRiskValue,itemCount:rows.length,coveragePct: totalDeficit ? Math.round((totalScheduled/totalDeficit)*100) : 0 };
}
window.EQV_ENGINE = { enrichRows, summarize, formatNumber, dateOnly };
