window.ITEM_TOOL_CONFIG = {
  appTitle:'Manufacturing Readiness Command Center', appSubtitle:'Demand, schedule, material and production-readiness intelligence', logo:'MP',
  materialCodePattern:'\\bMAT-\\d{4}\\b',
  itemCodePattern:'^SKU-[0-9]{4}$', customerItemCodePattern:'^SKU-[0-9]{4}$', defaultSelectedItem:'SKU-0001',
  searchPlaceholder:'Search item — SKU-0001, SKU-0002, SKU-0003…', bomSearchPlaceholder:'Search BOM item — SKU-0001, SKU-0002…',
  relationshipSearchPlaceholder:'Search any finished item or component — SKU-0001, MAT-0101, MAT-0202…',
  roleLabels:{customerA:'Customer Plan A',customerB:'Customer Plan B',customerC:'Customer Plan C'},
  customerAccounts:{
    customerA:{label:'Customer A',aliases:['CUSTOMER A'],fileTokens:['CUSTOMER A']},
    customerB:{label:'Customer B',aliases:['CUSTOMER B'],fileTokens:['CUSTOMER B']},
    customerC:{label:'Customer C',aliases:['CUSTOMER C'],fileTokens:['CUSTOMER C']}
  },
  weeklyCustomerRole:'customerB',
  rules:{
    dairyMinDays:75, nonDairyMinDays:45, productionBatchMinLbs:4000,
    smallCanPallets:3, normalCanPallets:2, smallCanSizeCode:700, smallCanMaxOz:8,
    splitRunThresholdCases:6000, dLineFirstBatchLbs:30000, dLineIncrementLbs:15000
  },
  knownComanAccounts:{'Customer A':['SKU-0003']},
  approvedAliases:{}, specialDescriptionAliases:[], exportPrefix:'Demo_Item', themeStorageKey:'manufacturingItemToolTheme'
};
