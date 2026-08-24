/* Shared demo business rules extracted from the production workflow. No real identifiers are included. */
function cloneDeep(x){ return JSON.parse(JSON.stringify(x)); }
function normalizeItem(x){ return String(x || '').trim().toUpperCase(); }
function fmtNum(n){ return Number(n || 0).toLocaleString('en-US'); }
function pct(n,d){ return d ? Math.round((Number(n||0)/Number(d||1))*100) : 0; }
function parseCaseValue(raw){
  const s = String(raw ?? '').trim();
  if(!s) return 0;
  if(s.startsWith('=')){
    const expr = s.slice(1).replace(/,/g,'');
    if(!/^[0-9+\-*/().\s]+$/.test(expr)) return NaN;
    try { return Math.max(0, Math.round(Number(Function('return (' + expr + ')')()))); } catch(e){ return NaN; }
  }
  return Math.max(0, Math.round(Number(s.replace(/,/g,''))));
}
function flattenSchedules(data){
  const rows=[];
  for(const weekKey of ['currentWeek','lastWeek']){
    const week = data[weekKey];
    if(!week) continue;
    const weekLabel = weekKey === 'currentWeek' ? 'Current Week' : 'Prior Week';
    for(const sch of (week.schedules || [])){
      for(const row of (sch.rows || [])) rows.push({...row, weekKey, weekLabel, schedule: sch.schedule, line: sch.line, scheduleStart: sch.scheduleStart});
    }
  }
  return rows;
}
function productionByItem(entries){
  const map = new Map();
  for(const e of entries || []){
    const key = normalizeItem(e.item);
    if(!map.has(key)) map.set(key, []);
    map.get(key).push(e);
  }
  for(const [, arr] of map){ arr.sort((a,b)=>String(b.productionDate).localeCompare(String(a.productionDate)) || String(b.lot).localeCompare(String(a.lot))); }
  return map;
}
function latestEntry(entries){ return (entries || [])[0] || null; }
function locationsForItem(rows, item){ return rows.filter(r => normalizeItem(r.item) === normalizeItem(item)); }
function riskStatus(row, history){
  const entries = history.get(normalizeItem(row.item)) || [];
  const latest = latestEntry(entries);
  if(!latest) return {status:'No history', tone:'risk', note:'No production entry found for this scheduled item.', coverage:0};
  const coverage = pct(latest.qty, row.cases);
  if(Number(latest.qty) >= Number(row.cases)) return {status:'Likely covered', tone:'good', note:'Latest production quantity meets or exceeds scheduled cases.', coverage:100};
  if(Number(latest.qty) > 0) return {status:'Partial', tone:'warn', note:'Production exists, but scheduled cases are not fully covered.', coverage};
  return {status:'Needs review', tone:'risk', note:'History exists, but the latest quantity is zero or unusable.', coverage:0};
}
function decisionFor(row, edit){
  if(edit?.finished) return {text:'Write 0 cases', tone:'good'};
  if(edit && edit.cases !== undefined && Number(edit.cases)!==Number(row.cases)) return {text:'Write edited cases', tone:'warn'};
  return {text:'No case change', tone:'neutral'};
}
function groupBy(arr, keyFn){ const m=new Map(); for(const x of arr){ const k=keyFn(x); if(!m.has(k))m.set(k,[]); m.get(k).push(x); } return m; }
function dateShort(x){ const d=new Date(x+'T00:00:00'); return Number.isNaN(d.getTime()) ? String(x) : d.toLocaleDateString('en-US',{month:'short',day:'numeric'}); }
