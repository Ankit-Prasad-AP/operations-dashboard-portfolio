const state = { rows: [], filtered: [], loaded: false };
const $ = id => document.getElementById(id);
function statusClass(status){ return status === 'SAFE' ? 'safe' : status === 'REVIEW' ? 'review' : 'risk'; }
function selectedRows(){
  const status = $('statusFilter').value;
  const actionOnly = $('showOnlyAction').checked;
  return state.rows.filter(row => (status === 'ALL' || row.status === status) && (!actionOnly || row.status !== 'SAFE'));
}
function renderKpis(rows){
  const s = EQV_ENGINE.summarize(rows);
  $('kpiGrid').innerHTML = [
    ['7-Day EQV Deficit', EQV_ENGINE.formatNumber(s.totalDeficit), `${s.itemCount} synthetic item risks`, ''],
    ['Schedule Coverage', `${s.coveragePct}%`, `${EQV_ENGINE.formatNumber(s.totalScheduled)} equivalent cases scheduled`, s.coveragePct>=100?'safe':s.coveragePct>=80?'review':'risk'],
    ['Needs Action', s.riskCount, `${EQV_ENGINE.formatNumber(s.atRiskValue)} equivalent cases not safe`, s.riskCount?'risk':'safe'],
    ['Manual Review', s.reviewCount, 'Timing, PA, or CSR confirmation needed', s.reviewCount?'review':'safe']
  ].map(([label,value,note,cls])=>`<article class="kpi ${cls}"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div><div class="kpi-note">${note}</div></article>`).join('');
}
function renderBars(rows){
  const totals = { SAFE:0, REVIEW:0, 'NOT SAFE':0 };
  rows.forEach(row => totals[row.status] += row.eqvDeficit);
  const max = Math.max(...Object.values(totals),1);
  const labels = [['SAFE','safe'],['REVIEW','review'],['NOT SAFE','risk']];
  $('statusChart').innerHTML = labels.map(([status,cls])=>{
    const value = totals[status];
    return `<div class="bar-row" title="${status}: ${EQV_ENGINE.formatNumber(value)} equivalent cases"><div class="bar-label">${status}</div><div class="bar-track"><div class="bar-fill ${cls}" style="width:${Math.max(3,(value/max)*100)}%"></div></div><div class="bar-value">${EQV_ENGINE.formatNumber(value)}</div></div>`;
  }).join('');
}
function renderDonut(rows){
  const counts = { SAFE:0, REVIEW:0, 'NOT SAFE':0 };
  rows.forEach(row => counts[row.status]++);
  const total = Math.max(rows.length,1);
  const safePct = counts.SAFE/total*100;
  const reviewPct = counts.REVIEW/total*100;
  const riskPct = counts['NOT SAFE']/total*100;
  const safeEnd = safePct;
  const reviewEnd = safePct + reviewPct;
  $('donutChart').innerHTML = `<div class="donut" style="background:conic-gradient(var(--safe) 0 ${safeEnd}%, var(--review) ${safeEnd}% ${reviewEnd}%, var(--risk) ${reviewEnd}% 100%)"><div class="donut-center"><strong>${Math.round((counts.SAFE/total)*100)}%</strong><span>safe mix</span></div></div><div class="legend"><span><i style="background:var(--safe)"></i>Safe ${counts.SAFE}</span><span><i style="background:var(--review)"></i>Review ${counts.REVIEW}</span><span><i style="background:var(--risk)"></i>Not safe ${counts['NOT SAFE']}</span></div>`;
}
function renderTimeline(rows){
  const sorted = [...rows].sort((a,b)=>String(a.runDate||'').localeCompare(String(b.runDate||''))).slice(0,6);
  $('timeline').innerHTML = sorted.map((row,index)=>{
    const width = 35 + (index+1)*9;
    return `<div class="time-item"><div class="time-date">${row.runDate ? EQV_ENGINE.dateOnly(row.runDate) : 'No run'}</div><div><div class="time-detail"><strong>${row.bucket}</strong> · ${row.schedule} · ${row.item} · Risk ${EQV_ENGINE.dateOnly(row.firstRisk)}</div><div class="time-line"><span style="width:${width}%"></span></div></div><span class="pill ${statusClass(row.status)}">${row.status}</span></div>`;
  }).join('') || '<div class="empty-state">Load demo data to view scheduled production timing.</div>';
}
function renderTable(rows){
  const mode = $('viewMode').value;
  $('riskTable').innerHTML = rows.map(row=>{
    const deficit = mode === 'EQV' ? row.eqvDeficit : row.rawDeficit;
    const scheduled = mode === 'EQV' ? row.eqvScheduled : row.scheduled;
    return `<tr><td class="item-code">${row.item}</td><td>${row.segment}</td><td>${EQV_ENGINE.dateOnly(row.firstRisk)}</td><td>${EQV_ENGINE.formatNumber(deficit)}</td><td>${EQV_ENGINE.formatNumber(scheduled)}</td><td><span class="muted">${row.bucket}</span><br>${row.schedule} · ${row.runDate || 'No visible run'}</td><td><span class="status-badge ${statusClass(row.status)}">${row.status}</span></td><td>${row.action}</td></tr>`;
  }).join('') || '<tr><td colspan="8" class="empty-state">No rows match the selected filters.</td></tr>';
}
function renderAction(rows){
  const s = EQV_ENGINE.summarize(rows);
  if(!state.loaded){
    $('actionHeadline').textContent = 'Load demo data to begin.';
    $('actionText').textContent = 'The dashboard will summarize whether production timing covers demand before the required date.';
    $('actionBadges').innerHTML = '';
    return;
  }
  if(s.riskCount){
    $('actionHeadline').textContent = `${s.riskCount} item${s.riskCount>1?'s':''} need planner action.`;
    $('actionText').textContent = 'Not-safe items either lack enough scheduled production or have production after the required risk date. Pull these runs forward, confirm finished-goods updates, or escalate with customer service.';
  } else if(s.reviewCount){
    $('actionHeadline').textContent = 'Coverage looks manageable, but review timing.';
    $('actionText').textContent = 'Manual-review rows may already be produced or may require PA/MAS updates before the deficit view clears.';
  } else {
    $('actionHeadline').textContent = 'All visible risks are covered.';
    $('actionText').textContent = 'The schedule covers the filtered demand before the risk dates in this synthetic demo.';
  }
  $('actionBadges').innerHTML = `<span class="pill safe">${s.safeCount} safe</span><span class="pill review">${s.reviewCount} review</span><span class="pill risk">${s.riskCount} not safe</span>`;
}
function render(){
  state.filtered = selectedRows();
  renderKpis(state.filtered);
  renderBars(state.filtered);
  renderDonut(state.filtered);
  renderTimeline(state.filtered);
  renderTable(state.filtered);
  renderAction(state.filtered);
}
function loadDemo(){
  state.rows = EQV_ENGINE.enrichRows(window.SAMPLE_DEFICITS || []);
  state.loaded = true;
  render();
}
function resetView(){
  state.rows = [];
  state.loaded = false;
  $('statusFilter').value = 'ALL';
  $('viewMode').value = 'EQV';
  $('showOnlyAction').checked = false;
  render();
}
['statusFilter','viewMode','showOnlyAction'].forEach(id => $(id).addEventListener('change', render));
$('loadDemoBtn').addEventListener('click', loadDemo);
$('resetBtn').addEventListener('click', resetView);
resetView();
