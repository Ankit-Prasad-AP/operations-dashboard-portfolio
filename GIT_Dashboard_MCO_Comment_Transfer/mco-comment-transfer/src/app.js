const $ = id => document.getElementById(id);
const fmt = n => Number(n||0).toLocaleString();
const moneyFmt = n => Number(n||0).toLocaleString(undefined,{maximumFractionDigits:0});
function esc(v){ return String(v ?? '').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])); }
function shortDate(iso){ if(!iso) return '—'; const [y,m,d]=iso.split('-'); return `${m}/${d}`; }
function badge(text,type='info'){ return `<span class="badge ${type}">${esc(text)}</span>`; }
function miniBars(values){ const max=Math.max(...values,1); return `<span class="mini-bars">${values.map(v=>`<i style="height:${Math.max(14,(v/max)*100)}%"></i>`).join('')}</span>`; }
function getFilteredItems(items){
  const status = $('statusFilter').value;
  const line = $('lineFilter').value;
  const q = $('searchBox').value.trim().toUpperCase();
  return items.filter(i => {
    const statusOk = status === 'All' || i.status === status;
    const lineOk = line === 'All' || (i.historicalLineList||[]).includes(line);
    const qOk = !q || [i.item,i.itemName,i.formula,i.dairyType,i.canSize,i.historicalLines].join(' ').toUpperCase().includes(q);
    return statusOk && lineOk && qOk;
  });
}
function renderKpis(result){
  const riskPct = Math.round((result.kpis.cutoffRiskItemCount / Math.max(result.kpis.itemCount,1))*100);
  const totalFc = result.items.reduce((a,i)=>a+Number(i.forecast.P8||0),0);
  const avgReadiness = Math.round(result.items.reduce((a,i)=>a+Math.min(100,Math.max(0,((Number(i.qoh||0)+Number(i.scheduled||0))/Math.max(1,Number(i.demandThroughCutoff||0)))*100)),0)/Math.max(result.items.length,1));
  $('heroRiskCount').textContent = fmt(result.kpis.cutoffRiskItemCount);
  $('kpis').innerHTML = `
    <article class="kpi-card risk"><div class="kpi-label">At-risk items</div><span class="kpi-value">${fmt(result.kpis.cutoffRiskItemCount)}</span><div class="kpi-sub">${riskPct}% of reviewed items have at least one negative row through the selected date.</div>${miniBars([2,4,3,result.kpis.cutoffRiskItemCount])}</article>
    <article class="kpi-card ok"><div class="kpi-label">Covered items</div><span class="kpi-value">${fmt(result.kpis.coveredCount)}</span><div class="kpi-sub">Items with a non-negative final balance after current and scheduled production.</div>${miniBars([4,5,6,result.kpis.coveredCount])}</article>
    <article class="kpi-card"><div class="kpi-label">Production applied</div><span class="kpi-value">${fmt(result.kpis.totalProduction)}</span><div class="kpi-sub">Cases added from current week production and next week schedule rows.</div>${miniBars([result.kpis.currentProduction,result.kpis.scheduledProduction,result.kpis.totalProduction])}</article>
    <article class="kpi-card warn"><div class="kpi-label">Risk exposure</div><span class="kpi-value">${fmt(result.kpis.totalShort)}</span><div class="kpi-sub">Cumulative shortage exposure across negative rows through the selected date.</div>${miniBars([900,1500,2400,result.kpis.totalShort])}</article>
    <article class="kpi-card"><div class="kpi-label">P8 forecast</div><span class="kpi-value">${fmt(totalFc)}</span><div class="kpi-sub">Forward-demand context embedded next to the item decision view.</div>${miniBars(result.items.map(i=>i.forecast.P8||0).slice(0,8))}</article>`;
  return avgReadiness;
}
function renderAction(result, readiness){
  const worst = [...result.negativeRows].sort((a,b)=>a.balance-b.balance)[0];
  const card = document.querySelector('.priority-card');
  card.classList.toggle('risk', !!worst);
  card.classList.toggle('ok', !worst);
  if(worst){
    $('actionTitle').textContent = `Prioritize ${worst.item} before the selected cutoff.`;
    $('actionText').textContent = `${worst.itemName} is the deepest shortage through the selected horizon. Review eligible production lines, schedule fit, and whether current/next-week production should be pulled forward.`;
    $('actionChips').innerHTML = `${badge(`Worst balance ${fmt(worst.balance)}`,'risk')}${badge(`Effective pick ${shortDate(worst.effectivePick)}`,'warn')}${badge(`Readiness ${readiness}%`,'info')}`;
  } else {
    $('actionTitle').textContent = 'No negative rows through the selected cutoff.';
    $('actionText').textContent = 'The selected date horizon is covered after applying current week production and next week schedule rows. Continue monitoring future demand and schedule changes.';
    $('actionChips').innerHTML = `${badge('Covered through cutoff','ok')}${badge(`Readiness ${readiness}%`,'info')}`;
  }
}
function renderCoverageDonut(result){
  const risk = result.kpis.cutoffRiskItemCount;
  const covered = Math.max(0,result.kpis.itemCount-risk);
  const deg = Math.round((risk/Math.max(result.kpis.itemCount,1))*360);
  $('coverageCaption').textContent = `${risk} risk / ${covered} covered`;
  $('coverageDonut').innerHTML = `
    <div class="donut" style="--riskDeg:${deg}deg"><div class="donut-inner">${Math.round((covered/Math.max(result.kpis.itemCount,1))*100)}%<small>covered</small></div></div>
    <div class="legend">
      <div class="legend-row"><span class="legend-left"><i style="background:var(--ok)"></i>Covered through horizon</span><b>${fmt(covered)}</b></div>
      <div class="legend-row"><span class="legend-left"><i style="background:var(--risk)"></i>At risk through horizon</span><b>${fmt(risk)}</b></div>
      <p class="small-note">This view focuses on the selected negative-balance-through date, not all future demand.</p>
    </div>`;
}
function renderLineBars(result){
  const byLine = new Map();
  result.production.forEach(r => {
    const line = r.line ? `Line ${String(r.line).replace(/[^A-D]/g,'') || r.line}` : 'Current Week';
    byLine.set(line,(byLine.get(line)||0)+Number(r.qty||0));
  });
  const rows = [...byLine.entries()].sort((a,b)=>b[1]-a[1]);
  const max = Math.max(...rows.map(r=>r[1]),1);
  $('lineBars').innerHTML = rows.map(([line,qty])=>`<div class="bar-row"><div class="bar-label">${esc(line)}</div><div class="bar-track"><div class="bar-fill ${line==='Current Week'?'ok':''}" style="width:${(qty/max)*100}%"></div></div><div class="bar-value">${fmt(qty)}</div></div>`).join('');
}
function renderForecastChart(result){
  const periods = window.DASHBOARD_CONFIG.demo.forecastPeriods;
  const totals = periods.map(p => result.items.reduce((a,i)=>a+Number(i.forecast[p]||0),0));
  const w=560,h=210,pad=34,max=Math.max(...totals,1),min=Math.min(...totals,0);
  const points = totals.map((v,idx)=>{ const x=pad+idx*((w-pad*2)/(periods.length-1)); const y=h-pad-((v-min)/Math.max(1,max-min))*(h-pad*2); return [x,y,v,periods[idx]]; });
  const line = points.map((p,i)=>`${i?'L':'M'}${p[0]},${p[1]}`).join(' ');
  const area = `${line} L ${points.at(-1)[0]},${h-pad} L ${points[0][0]},${h-pad} Z`;
  $('forecastChart').innerHTML = `<svg class="trend-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="Forecast trend by period">
    <defs><linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#0b63ce" stop-opacity=".22"/><stop offset="1" stop-color="#0b63ce" stop-opacity=".02"/></linearGradient></defs>
    ${[0,1,2,3].map(i=>`<line class="trend-grid" x1="${pad}" x2="${w-pad}" y1="${pad+i*((h-pad*2)/3)}" y2="${pad+i*((h-pad*2)/3)}"/>`).join('')}
    <path class="trend-area" d="${area}"/><path class="trend-line" d="${line}"/>
    ${points.map(p=>`<circle class="trend-dot" cx="${p[0]}" cy="${p[1]}" r="6"/><text class="axis-label" x="${p[0]}" y="${h-8}" text-anchor="middle">${p[3]}</text><text class="axis-label" x="${p[0]}" y="${p[1]-12}" text-anchor="middle">${fmt(p[2])}</text>`).join('')}
  </svg>`;
}
function renderRiskTimeline(result){
  const byDate = new Map();
  result.negativeRows.forEach(r => byDate.set(r.effectivePick,(byDate.get(r.effectivePick)||0)+Math.abs(r.balance)));
  const rows = [...byDate.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
  if(!rows.length){ $('riskTimeline').innerHTML = '<div class="empty">No shortage exposure through this date.</div>'; return; }
  const max = Math.max(...rows.map(r=>r[1]),1);
  $('riskTimeline').innerHTML = rows.map(([date,qty])=>`<div class="bar-row"><div class="bar-label">${shortDate(date)}</div><div class="bar-track"><div class="bar-fill risk" style="width:${(qty/max)*100}%"></div></div><div class="bar-value">${fmt(qty)}</div></div>`).join('');
}
function renderItemTable(result){
  const items = getFilteredItems(result.items).sort((a,b)=>a.status.localeCompare(b.status)||a.finalBalance-b.finalBalance);
  $('itemCountLabel').textContent = `${items.length} shown`;
  $('itemTable').innerHTML = `<thead><tr><th>Item</th><th>Metadata</th><th>Forecast context</th><th class="num">Production</th><th class="num">Final balance</th><th>Status</th></tr></thead><tbody>` +
    items.map(i => `<tr>
      <td><div class="item-title">${esc(i.item)}</div><div class="muted">${esc(i.itemName)}<br>Formula ${esc(i.formula)}</div></td>
      <td><div class="meta-grid">${badge(`${i.expiryDays} days`,'info')}${badge(i.dairyType,i.dairyType==='Dairy'?'warn':'ok')}${badge(i.canSize,'info')}${badge(`Lines ${i.historicalLines}`,'info')}</div></td>
      <td><div class="forecast-stack"><span>P6 ${fmt(i.forecast.P6)}</span><span>P7 ${fmt(i.forecast.P7)}</span><span>P8 ${fmt(i.forecast.P8)}</span><span>P9 ${fmt(i.forecast.P9)}</span></div></td>
      <td class="num">${fmt(i.scheduled)}</td>
      <td class="num ${i.finalBalance<0?'neg':'pos'}">${fmt(i.finalBalance)}</td>
      <td>${badge(i.status,i.status==='Risk'?'risk':'ok')}</td>
    </tr>`).join('') + '</tbody>';
}
function renderNegativeTable(result){
  $('negativeCountLabel').textContent = `${result.negativeRows.length} rows`;
  $('negativeTable').innerHTML = `<thead><tr><th>Item</th><th>Order</th><th>Original pick</th><th>Ship</th><th>Effective pick</th><th class="num">Qty</th><th class="num">Balance</th></tr></thead><tbody>` +
    (result.negativeRows.length ? result.negativeRows.map(r => `<tr><td><b>${esc(r.item)}</b><div class="muted">${esc(r.itemName)}</div></td><td>${esc(r.order)}<div class="muted">${esc(r.customer)}</div></td><td>${esc(r.pick||'(blank)')}</td><td>${esc(r.ship)}</td><td>${esc(r.effectivePick)}</td><td class="num">${fmt(r.qty)}</td><td class="num neg">${fmt(r.balance)}</td></tr>`).join('') : `<tr><td colspan="7" class="empty">No negative rows through selected date.</td></tr>`) + '</tbody>';
}
function renderSourceAudit(result){
  const config = window.DASHBOARD_CONFIG;
  const blankPickCount = result.negativeRows.filter(r=>!r.pick).length;
  $('sourceAudit').innerHTML = `<tbody>
    <tr><td>Mode</td><td>Public synthetic demo only</td></tr>
    <tr><td>Planning horizon</td><td>Negative balance through ${esc($('cutoffDate').value)}</td></tr>
    <tr><td>Pick Date fallback</td><td>If Pick Date is blank, use Ship Date - ${config.rules.pickDateFallbackDays} day(s) for filtering only</td></tr>
    <tr><td>Blank-pick risk rows captured</td><td>${fmt(blankPickCount)}</td></tr>
    <tr><td>Excluded rows</td><td>${fmt(result.excludedRows.length)} placeholder/R-order rows excluded from negative reports</td></tr>
    <tr><td>Production sources</td><td>Current Week Production + Next Week Schedule</td></tr>
    <tr><td>Confidentiality</td><td>No real company, customer, source workbook, or item identifiers included</td></tr>
  </tbody>`;
  $('excludedRows').innerHTML = result.excludedRows.length ? `<div class="excluded-list">${result.excludedRows.map(r=>`<div class="excluded-row"><span>${esc(r.item)} · ${esc(r.order)}</span><b>${esc(r.reason)}</b></div>`).join('')}</div>` : '<p class="small-note">No excluded rows in this run.</p>';
}
function exportCsv(){
  const r = window.LAST_RESULT || window.MCO_ENGINE.calculate(window.DASHBOARD_CONFIG, window.SAMPLE_DATA, $('cutoffDate').value);
  const lines = [['Item','Order','Customer','Original Pick','Ship','Effective Pick','Qty','Balance']];
  r.negativeRows.forEach(x => lines.push([x.item,x.order,x.customer,x.pick,x.ship,x.effectivePick,x.qty,x.balance]));
  const csv = lines.map(row => row.map(v => `"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'synthetic_negative_balance_demo.csv'; a.click();
  URL.revokeObjectURL(a.href);
}
function render(){
  const config = window.DASHBOARD_CONFIG;
  config.rules.pickDateFallbackDays = Number($('fallbackDays').value || 3);
  const cutoff = $('cutoffDate').value || config.demo.defaultNegativeThroughDate;
  const result = window.MCO_ENGINE.calculate(config, window.SAMPLE_DATA, cutoff);
  const readiness = renderKpis(result);
  renderAction(result, readiness);
  renderCoverageDonut(result);
  renderLineBars(result);
  renderForecastChart(result);
  renderRiskTimeline(result);
  renderItemTable(result);
  renderNegativeTable(result);
  renderSourceAudit(result);
  window.LAST_RESULT = result;
}
document.addEventListener('DOMContentLoaded', () => {
  $('cutoffDate').value = window.DASHBOARD_CONFIG.demo.defaultNegativeThroughDate;
  $('fallbackDays').value = window.DASHBOARD_CONFIG.rules.pickDateFallbackDays;
  ['cutoffDate','fallbackDays','statusFilter','lineFilter','searchBox'].forEach(id => $(id).addEventListener('input', render));
  $('loadDemo').addEventListener('click', render);
  $('exportCsv').addEventListener('click', exportCsv);
  render();
});
