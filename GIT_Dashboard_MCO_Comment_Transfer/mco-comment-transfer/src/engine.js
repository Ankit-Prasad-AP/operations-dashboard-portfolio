(function(){
  function daysBetweenEpoch(dateString){
    if(!dateString) return 0;
    const [y,m,d] = String(dateString).split('-').map(Number);
    if(!y||!m||!d) return 0;
    return Math.floor(Date.UTC(y,m-1,d)/86400000);
  }
  function dateMinusDays(dateString, days){
    const s = daysBetweenEpoch(dateString);
    if(!s) return '';
    const d = new Date((s - Number(days||0))*86400000);
    return d.toISOString().slice(0,10);
  }
  function effectivePickDate(order, fallbackDays){
    if(order.pick) return order.pick;
    if(order.ship) return dateMinusDays(order.ship, fallbackDays);
    return '';
  }
  function isPlaceholderDate(dateString, config){
    if(!dateString) return false;
    const y = Number(String(dateString).slice(0,4));
    const lim = config.rules.placeholderYears;
    return y <= lim.min || y >= lim.max;
  }
  function isExcludedOrder(order, config){
    const prefixes = config.rules.excludeOrderPrefixes || [];
    const orderId = String(order.order||'').toUpperCase();
    return prefixes.some(p => orderId.startsWith(String(p).toUpperCase())) || isPlaceholderDate(order.pick, config) || isPlaceholderDate(order.ship, config);
  }
  function dairyType(itemMeta, config){
    const keyword = config.rules.dairyAllergenKeyword || 'MILK';
    return String(itemMeta.allergens||'').toUpperCase().includes(keyword) ? 'Dairy' : 'Non Dairy';
  }
  function canSize(itemMeta, config){
    const oz = Number(itemMeta.canOz||0);
    if(!oz) return '';
    return oz <= Number(config.rules.smallCanMaxOz||7.5) ? 'Small Can' : 'Large Can';
  }
  function buildProductionMap(records){
    const map = new Map();
    (records||[]).forEach(r => map.set(r.item, (map.get(r.item)||0) + Number(r.qty||0)));
    return map;
  }
  function calculate(config, data, cutoffDate){
    const fallbackDays = Number(config.rules.pickDateFallbackDays||3);
    const production = [...(data.currentWeekProduction||[]), ...(data.scheduledProduction||[])];
    const productionMap = buildProductionMap(production);
    const cutoffSerial = daysBetweenEpoch(cutoffDate || config.demo.defaultNegativeThroughDate);
    const items = [];
    const negativeRows = [];
    const excludedRows = [];
    let totalDemand = 0, totalProduction = 0, totalShort = 0, currentProduction = 0, scheduledProduction = 0;
    (data.currentWeekProduction||[]).forEach(r => currentProduction += Number(r.qty||0));
    (data.scheduledProduction||[]).forEach(r => scheduledProduction += Number(r.qty||0));
    totalProduction = currentProduction + scheduledProduction;
    (data.pa||[]).forEach(section => {
      const meta = data.itemMaster[section.item] || {};
      const fc = data.forecast[section.item] || {};
      const scheduled = productionMap.get(section.item)||0;
      let balance = Number(section.qoh||0) + scheduled;
      const orderResults = [];
      let worstCutoffBalance = balance;
      let demandThroughCutoff = 0;
      (section.orders||[]).forEach(order => {
        const excluded = isExcludedOrder(order, config);
        const effPick = effectivePickDate(order, fallbackDays);
        if(excluded){ excludedRows.push({item:section.item, order:order.order, reason:'Excluded placeholder/R-order'}); return; }
        const qty = Number(order.qty||0);
        totalDemand += qty;
        balance -= qty;
        const inCutoff = effPick && daysBetweenEpoch(effPick) <= cutoffSerial;
        const row = {item:section.item, itemName:section.itemName, order:order.order, customer:order.customer, pick:order.pick||'', ship:order.ship||'', effectivePick:effPick, qty, balance, inCutoff};
        orderResults.push(row);
        if(inCutoff){
          demandThroughCutoff += qty;
          worstCutoffBalance = Math.min(worstCutoffBalance, balance);
          if(balance < 0){ negativeRows.push(row); totalShort += Math.abs(balance); }
        }
      });
      const status = balance < 0 ? 'Risk' : 'Covered';
      items.push({
        item:section.item,
        itemName:section.itemName,
        qoh:section.qoh,
        scheduled,
        demandThroughCutoff,
        finalBalance:balance,
        worstCutoffBalance,
        status,
        forecast: fc,
        formula: fc.formula || '',
        expiryDays: meta.expiryDays || '',
        dairyType: dairyType(meta, config),
        canSize: canSize(meta, config),
        historicalLines: (meta.historicalLines||[]).join(' / '),
        historicalLineList: meta.historicalLines||[],
        orders: orderResults
      });
    });
    const uniqueNegativeItems = new Set(negativeRows.map(r=>r.item));
    return {
      items,
      negativeRows,
      excludedRows,
      production,
      kpis: {
        itemCount: items.length,
        riskCount: items.filter(i=>i.status==='Risk').length,
        coveredCount: items.filter(i=>i.status==='Covered').length,
        cutoffRiskItemCount: uniqueNegativeItems.size,
        totalDemand,
        totalProduction,
        currentProduction,
        scheduledProduction,
        totalShort
      }
    };
  }
  window.MCO_ENGINE = { calculate, effectivePickDate, isExcludedOrder, dairyType, canSize };
})();
