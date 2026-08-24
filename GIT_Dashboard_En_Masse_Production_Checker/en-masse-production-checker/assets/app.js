const state = { data:null, rows:[], history:new Map(), edits:new Map(), selected:new Map(), showPrior:false, onlyAction:false, search:'', schedule:'All', activeItem:null };
const $ = (id)=>document.getElementById(id);
const esc = (s)=>String(s ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function keyFor(row){ return `${row.weekKey}|${row.schedule}|${row.row}|${row.item}`; }
function editFor(row){ return state.edits.get(keyFor(row)) || {}; }
function toast(msg){ const el=$('toast'); el.textContent=msg; el.classList.remove('hidden'); clearTimeout(toast._t); toast._t=setTimeout(()=>el.classList.add('hidden'),2600); }
function loadDemoData(){
  state.data = cloneDeep(window.SAMPLE_DATA);
  state.rows = flattenSchedules(state.data);
  state.history = productionByItem(state.data.productionEntries);
  state.edits.clear(); state.selected.clear(); state.showPrior=false; state.onlyAction=false; state.search=''; state.schedule='All'; state.activeItem=null;
  render(); toast('Demo data loaded. Review flags and case-update decisions are now visible.');
}
function displayedRows(){
  let rows = state.rows.filter(r => state.showPrior || r.weekKey === 'currentWeek');
  if(state.schedule !== 'All') rows = rows.filter(r=>r.schedule===state.schedule);
  const q=normalizeItem(state.search);
  if(q) rows = rows.filter(r=>[r.item,r.description,r.schedule,r.weekLabel,r.itemStart].some(x=>normalizeItem(x).includes(q)));
  if(state.onlyAction) rows = rows.filter(r=>riskStatus(r,state.history).tone !== 'good' || Object.keys(editFor(r)).length);
  return rows;
}
function metricData(rows){
  const current = rows.filter(r=>r.weekKey==='currentWeek');
  const totalCases=current.reduce((a,r)=>a+Number(r.cases||0),0);
  const riskRows=current.map(r=>riskStatus(r,state.history));
  const good=riskRows.filter(r=>r.tone==='good').length, warn=riskRows.filter(r=>r.tone==='warn').length, risk=riskRows.filter(r=>r.tone==='risk').length;
  const readiness=pct(good,current.length||1);
  const selectedTotal=[...state.selected.keys()].reduce((a,item)=>a+selectedQty(item),0);
  return {current,totalCases,good,warn,risk,readiness,selectedTotal,edited:state.edits.size};
}
function selectedQty(item){
  const set=state.selected.get(normalizeItem(item)) || new Set(); let total=0;
  state.data.productionEntries.forEach((e,i)=>{ if(set.has(`${normalizeItem(e.item)}|${i}`)) total += Number(e.qty||0); });
  return total;
}
function toggleProd(item, idx, checked){
  const key=normalizeItem(item); if(!state.selected.has(key)) state.selected.set(key,new Set());
  const id=`${key}|${idx}`; checked ? state.selected.get(key).add(id) : state.selected.get(key).delete(id);
  renderItemModal(item); render();
}
function useSelected(item){
  const qty=selectedQty(item); if(!qty){ toast('Select production entries first.'); return; }
  const locs=locationsForItem(state.rows, item).filter(r=>r.weekKey==='currentWeek');
  for(const r of locs){ const k=keyFor(r); const e=state.edits.get(k)||{}; e.cases=Math.max(0, Number(r.cases||0)-qty); state.edits.set(k,e); }
  renderItemModal(item); render(); toast(`Reduced current-week cases for ${item} by ${fmtNum(qty)}.`);
}
function finishAll(schedule){
  let count=0;
  for(const row of state.rows.filter(r=>r.weekKey==='currentWeek' && r.schedule===schedule)){ const e=state.edits.get(keyFor(row))||{}; e.finished=true; state.edits.set(keyFor(row),e); count++; }
  render(); toast(`Marked ${count} rows finished in ${schedule}.`);
}
function setEdit(row, value, field){ const k=keyFor(row); const existing=state.edits.get(k)||{}; existing[field]=value; state.edits.set(k, existing); render(); }
function render(){
  if(!state.data){ renderEmpty(); return; }
  const rows = displayedRows(); const metrics = metricData(displayedRows().concat(state.rows.filter(r=>r.weekKey==='lastWeek'&&state.showPrior)));
  $('app').innerHTML = `${renderStory()}${renderKpis(metrics)}<section class="workspace"><aside>${renderControls()}${renderInsight(metrics)}</aside><section>${renderCharts()}${renderCallouts(metrics)}${renderTable(rows)}</section></section>`;
  syncControls();
}
function renderEmpty(){
  $('app').innerHTML = `<section class="empty"><div class="emptyCard"><span class="eyebrow" style="color:#164b88;background:#eef6ff;border-color:#c9def8">Ready for demo</span><h2>Turn schedule rows into update decisions.</h2><p>Load the sanitized sample data to see KPI cards, risk charts, prior-week context, production history, selected-quantity math, finished rows, and case-only update decisions.</p><button class="btn blue" onclick="loadDemoData()">Load Demo Data</button></div></section>`;
}
function renderStory(){
  return `<section class="storyFlow"><div class="storyStep"><span>1 · Input</span><b>Current schedule + prior-week context</b></div><div class="storyStep"><span>2 · Match</span><b>Production history by item and lot</b></div><div class="storyStep"><span>3 · Decide</span><b>Reduce, finish, or leave unchanged</b></div><div class="storyStep"><span>4 · Protect</span><b>Case-only update logic</b></div><div class="storyStep"><span>5 · Review</span><b>Export clean decision file</b></div></section>`;
}
function renderKpis(m){
  return `<section class="kpiGrid"><article class="kpi"><label>Current-week rows</label><strong>${m.current.length}</strong><small>Schedule lines requiring review</small>${spark([12,18,17,23,26,31])}</article><article class="kpi"><label>Scheduled cases</label><strong>${fmtNum(m.totalCases)}</strong><small>Visible current-week planned cases</small>${spark([20,18,25,24,32,29])}</article><article class="kpi good"><label>Production readiness</label><strong>${m.readiness}%</strong><small>Rows likely covered by recent history</small>${spark([44,51,50,58,63,67])}</article><article class="kpi warn"><label>Review flags</label><strong>${m.warn+m.risk}</strong><small>Partial or missing history</small>${spark([7,9,10,8,6,5])}</article><article class="kpi risk"><label>Edited rows</label><strong>${m.edited}</strong><small>Rows marked for case-only updates</small>${spark([0,1,1,2,2,m.edited])}</article></section>`;
}
function spark(vals){ const max=Math.max(...vals,1), pts=vals.map((v,i)=>`${i*22},${24-(v/max)*21}`).join(' '); return `<svg class="spark" viewBox="0 0 110 26" preserveAspectRatio="none"><path d="M0,26 L${pts.replace(/ /g,' L')} L110,26 Z"></path><polyline points="${pts}"></polyline></svg>`; }
function renderControls(){
  const schedules=['All',...[...new Set(state.rows.filter(r=>state.showPrior||r.weekKey==='currentWeek').map(r=>r.schedule))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}))];
  return `<section class="panel"><div class="panelHeader"><h2>Control center</h2><p>Filter the demo like a planner reviewing a live schedule before update.</p></div><div class="filters"><div class="field"><label>Search</label><input id="search" placeholder="Item, schedule, or description" value="${esc(state.search)}" oninput="state.search=this.value;render()"></div><div class="field"><label>Schedule</label><select id="schedule" onchange="state.schedule=this.value;render()">${schedules.map(s=>`<option ${state.schedule===s?'selected':''}>${esc(s)}</option>`).join('')}</select></div><label class="toggleRow"><span>Show prior week<small>Use context to avoid duplicate updates.</small></span><input id="showPrior" type="checkbox" ${state.showPrior?'checked':''} onchange="state.showPrior=this.checked;state.schedule='All';render()"></label><label class="toggleRow"><span>Action view<small>Show only flags and edited rows.</small></span><input id="onlyAction" type="checkbox" ${state.onlyAction?'checked':''} onchange="state.onlyAction=this.checked;render()"></label><button class="btn blue" onclick="exportCsv()">Export Demo CSV</button><button class="btn subtle" onclick="loadDemoData()">Reset Demo</button></div></section>`;
}
function syncControls(){ const q=$('search'); if(q)q.value=state.search; }
function renderInsight(m){
  const message = m.warn+m.risk ? `${m.warn+m.risk} current-week rows need review before a case-only update is exported.` : 'All visible current-week rows are currently covered by recent production history.';
  return `<section class="insight"><b>Recommended action</b><p>${message} Open item details, select the production entries that apply, and reduce cases or mark rows finished only when the update is confirmed.</p></section>`;
}
function renderCharts(){ return `<section class="charts">${renderDonut()}${renderLineBars()}${renderTrend()}${renderTimeline()}</section>`; }
function renderDonut(){
  const rows=state.rows.filter(r=>r.weekKey==='currentWeek'); const counts={good:0,warn:0,risk:0}; rows.forEach(r=>counts[riskStatus(r,state.history).tone]++);
  const total=Math.max(1,rows.length); const g=counts.good/total*360, w=counts.warn/total*360;
  const style=`background:conic-gradient(var(--good) 0 ${g}deg,#d98700 ${g}deg ${g+w}deg,var(--risk) ${g+w}deg 360deg)`;
  return `<article class="panel chartCard"><div class="chartTitle"><div><h3>Coverage mix</h3><span>Current-week rows by production-history status.</span></div></div><div class="donutWrap"><div class="donut" style="${style}"><div class="donutCenter"><strong>${pct(counts.good,total)}%</strong><small>ready</small></div></div><div class="legend"><div class="legendItem"><span><i class="dot good"></i>Likely covered</span><b>${counts.good}</b></div><div class="legendItem"><span><i class="dot warn"></i>Partial</span><b>${counts.warn}</b></div><div class="legendItem"><span><i class="dot risk"></i>Needs review</span><b>${counts.risk}</b></div></div></div></article>`;
}
function renderLineBars(){
  const rows=state.rows.filter(r=>r.weekKey==='currentWeek'); const groups=groupBy(rows,r=>r.line); const totals=[...groups].map(([line,rs])=>({line,cases:rs.reduce((a,r)=>a+Number(r.cases||0),0),rows:rs.length})).sort((a,b)=>a.line.localeCompare(b.line)); const max=Math.max(...totals.map(x=>x.cases),1);
  return `<article class="panel chartCard"><div class="chartTitle"><div><h3>Scheduled cases by line</h3><span>Where the current production load is concentrated.</span></div></div><div class="barRows">${totals.map(x=>`<div class="barRow"><span>Line ${x.line}</span><div class="barTrack"><div class="barFill" style="width:${pct(x.cases,max)}%"></div></div><b>${fmtNum(x.cases)}</b></div>`).join('')}</div></article>`;
}
function renderTrend(){
  const entries=[...state.data.productionEntries].sort((a,b)=>String(a.productionDate).localeCompare(String(b.productionDate))); const grouped=[...groupBy(entries,e=>e.productionDate)].map(([date,arr])=>({date,qty:arr.reduce((a,e)=>a+Number(e.qty||0),0)})); const max=Math.max(...grouped.map(x=>x.qty),1); const pts=grouped.map((x,i)=>`${(i/(grouped.length-1||1))*320},${130-(x.qty/max)*112}`).join(' ');
  return `<article class="panel chartCard"><div class="chartTitle"><div><h3>Recent production trend</h3><span>Daily quantities behind the update decision.</span></div></div><svg viewBox="0 0 340 154" width="100%" height="170" role="img" aria-label="Recent production trend"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2251c4" stop-opacity=".24"/><stop offset="1" stop-color="#2251c4" stop-opacity="0"/></linearGradient></defs><path d="M0,150 L${pts.replace(/ /g,' L')} L320,150 Z" fill="url(#area)"></path><polyline points="${pts}" fill="none" stroke="#2251c4" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></polyline>${grouped.map((x,i)=>`<circle cx="${(i/(grouped.length-1||1))*320}" cy="${130-(x.qty/max)*112}" r="4" fill="#2251c4"><title>${dateShort(x.date)} · ${fmtNum(x.qty)} cases</title></circle>`).join('')}<text x="0" y="150" fill="#667085" font-size="12">${dateShort(grouped[0].date)}</text><text x="270" y="150" fill="#667085" font-size="12">${dateShort(grouped[grouped.length-1].date)}</text></svg></article>`;
}
function renderTimeline(){
  const schedules=[...groupBy(state.rows.filter(r=>r.weekKey==='currentWeek'),r=>r.schedule)].map(([schedule,rs],i)=>({schedule,line:rs[0].line,start:rs[0].scheduleStart,cases:rs.reduce((a,r)=>a+Number(r.cases||0),0),pos:8+i*16,width:22+rs.length*7}));
  return `<article class="panel chartCard"><div class="chartTitle"><div><h3>Schedule cadence</h3><span>Current-week sheet timing and relative case load.</span></div></div><div class="timeline">${schedules.map(s=>`<div class="timeItem"><b>${esc(s.schedule)}</b><div class="timeLine"><div class="timeFill" style="margin-left:${s.pos}%;width:${Math.min(80,s.width)}%"></div></div><span>${fmtNum(s.cases)}</span></div>`).join('')}</div></article>`;
}
function renderCallouts(m){
  return `<section class="callouts"><article class="callout good"><h3>Protected update path</h3><p>The public demo mirrors a case-only decision flow: finish rows write zero, edited rows write the calculated value, and unchanged rows remain untouched.</p></article><article class="callout warn"><h3>Partial production exists</h3><p>Amber rows show production history that is below planned cases. The user should select entries and calculate the remaining balance.</p></article><article class="callout risk"><h3>Missing or zero history</h3><p>Red rows need investigation before schedule cases are reduced or finished.</p></article></section>`;
}
function renderTable(rows){
  return `<section id="details" class="panel tablePanel"><div class="tableToolbar"><div><h2>Decision table</h2><span class="sub">Click an item to see schedule locations and selectable production entries.</span></div><div><button class="btn subtle" onclick="state.onlyAction=true;render()">Show Action Rows</button></div></div><div class="tableWrap"><table class="scheduleTable"><thead><tr><th>Week</th><th>Schedule</th><th>Item start</th><th>Item</th><th>Description</th><th>Planned cases</th><th>Latest production</th><th>Status</th><th>Case update</th><th>Decision</th><th>Finished</th></tr></thead><tbody>${rows.map(renderRow).join('')}</tbody></table></div></section>`;
}
function renderRow(row){
  const entries=state.history.get(normalizeItem(row.item)) || []; const latest=latestEntry(entries); const risk=riskStatus(row,state.history); const edit=editFor(row); const val = edit.cases ?? row.cases; const d=decisionFor(row,edit); const latestText=latest?`${dateShort(latest.productionDate)} · ${fmtNum(latest.qty)} cases`:'No history';
  return `<tr class="${row.weekKey==='lastWeek'?'prior':''}"><td><span class="pill ${row.weekKey==='lastWeek'?'prior':'current'}">${row.weekLabel}</span></td><td><b>${row.schedule}</b><span class="sub">${row.scheduleStart}</span></td><td class="mono">${row.itemStart}</td><td><button class="itemBtn" onclick="renderItemModal('${esc(row.item)}')">${esc(row.item)}</button></td><td>${esc(row.description)}</td><td class="mono"><b>${fmtNum(row.cases)}</b></td><td>${latestText}<span class="sub">${latest?esc(latest.lot):'Open item details to investigate.'}</span></td><td><span class="status ${risk.tone}">${risk.status}</span><div class="progress"><div class="progressFill ${risk.tone}" style="width:${Math.min(100,risk.coverage)}%"></div></div><span class="sub">${risk.note}</span></td><td><input class="caseInput" value="${esc(val)}" onchange="handleCaseInput(this,'${esc(keyFor(row))}')"><span class="sub">Try =1008-432</span></td><td><span class="actionText ${d.tone}">${d.text}</span></td><td><label class="finished"><input type="checkbox" ${edit.finished?'checked':''} onchange="handleFinished(this,'${esc(keyFor(row))}')"> Finished</label></td></tr>`;
}
function rowByKey(k){ return state.rows.find(r=>keyFor(r)===k); }
function handleCaseInput(el,k){ const row=rowByKey(k); if(!row) return; const parsed=parseCaseValue(el.value); if(Number.isFinite(parsed)){ const e=state.edits.get(k)||{}; e.cases=parsed; state.edits.set(k,e); toast(`Case update set to ${fmtNum(parsed)} for ${row.item}.`); } else toast('Use a number or a simple formula like =1008-432.'); render(); }
function handleFinished(el,k){ const row=rowByKey(k); if(!row) return; const e=state.edits.get(k)||{}; e.finished=el.checked; state.edits.set(k,e); render(); toast(`${row.item} ${el.checked?'marked finished':'unmarked finished'}.`); }
function renderItemModal(item){
  state.activeItem=item; const rows=locationsForItem(state.rows,item); const entries=state.data.productionEntries.map((e,i)=>({...e,_idx:i})).filter(e=>normalizeItem(e.item)===normalizeItem(item)); const selected=selectedQty(item); const currentCases=rows.filter(r=>r.weekKey==='currentWeek').reduce((a,r)=>a+Number(r.cases||0),0);
  const locHtml=rows.map(r=>`<tr><td><span class="pill ${r.weekKey==='lastWeek'?'prior':'current'}">${r.weekLabel}</span></td><td>${r.schedule}</td><td>${r.scheduleStart}</td><td>${r.itemStart}</td><td>${r.row}</td><td>${fmtNum(r.cases)}</td></tr>`).join('');
  const selectedSet=state.selected.get(normalizeItem(item))||new Set();
  const prodHtml=entries.map(e=>`<tr><td><input type="checkbox" onchange="toggleProd('${esc(item)}',${e._idx},this.checked)" ${selectedSet.has(`${normalizeItem(item)}|${e._idx}`)?'checked':''}></td><td>${dateShort(e.productionDate)}</td><td>${esc(e.lot)}</td><td>${esc(e.location)}</td><td class="mono"><b>${fmtNum(e.qty)}</b></td><td>${fmtNum(e.transactions)}</td></tr>`).join('') || `<tr><td colspan="6">No production history was found for this synthetic item.</td></tr>`;
  $('modal').innerHTML=`<div class="modal" onclick="if(event.target.className==='modal')$('modal').innerHTML=''"><div class="modalCard"><div class="modalHead"><div><h2>${esc(item)} · schedule and production detail</h2><p>Review every scheduled location, select applicable production entries, and calculate the case-only update decision.</p></div><button class="closeBtn" onclick="$('modal').innerHTML=''">Close</button></div><div class="modalBody"><section class="miniGrid"><div class="miniMetric"><span>Current planned</span><b>${fmtNum(currentCases)}</b></div><div class="miniMetric"><span>Selected production</span><b>${fmtNum(selected)}</b></div><div class="miniMetric"><span>Projected remaining</span><b>${fmtNum(Math.max(0,currentCases-selected))}</b></div><div class="miniMetric"><span>Locations</span><b>${rows.length}</b></div></section><div><button class="btn blue" onclick="useSelected('${esc(item)}')">Reduce current-week cases by selected quantity</button> <button class="btn subtle" onclick="state.selected.set('${normalizeItem(item)}',new Set());renderItemModal('${esc(item)}');render()">Clear selected entries</button></div><section><h3>Schedule locations</h3><table class="smallTable"><thead><tr><th>Week</th><th>Schedule</th><th>Schedule start</th><th>Item start</th><th>Row</th><th>Cases</th></tr></thead><tbody>${locHtml}</tbody></table></section><section><h3>Selectable production history</h3><table class="smallTable"><thead><tr><th>Select</th><th>Production date</th><th>Lot</th><th>Line</th><th>Qty</th><th>Transactions</th></tr></thead><tbody>${prodHtml}</tbody></table></section></div></div></div>`;
}
function exportCsv(){
  const lines=['Week,Schedule,Row,Item,OriginalCases,EditedCases,Finished,CasesToWriteBack,Decision'];
  for(const row of state.rows){ const edit=editFor(row); const edited=edit.cases ?? row.cases; const write=edit.finished?0:edited; const changed = edit.finished || Number(edited)!==Number(row.cases); if(changed) lines.push([row.weekLabel,row.schedule,row.row,row.item,row.cases,edited,!!edit.finished,write,'Sanitized demo case-only update'].join(',')); }
  if(lines.length===1){ toast('No edited or finished rows to export yet.'); return; }
  const blob=new Blob([lines.join('\n')],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='demo_case_only_updates.csv'; a.click(); URL.revokeObjectURL(a.href); toast(`Exported ${lines.length-1} case-only update decisions.`);
}
window.addEventListener('DOMContentLoaded', render);
