window.DASHBOARD_CONFIG = {
  app:{title:'Cream Demand & Tanker Allocation',version:'Portfolio Showcase',outputPrefix:'Cream_Tanker_Demo'},
  schedule:{lineIds:['A','B','C','D'],slotNumbers:[1,2,3,4,5,6],sharedLines:['A','B'],sharedSiteKey:'SITE-1',siteKeys:['SITE-1','SITE-2','SITE-3'],lineToSite:{A:'SITE-1',B:'SITE-1',C:'SITE-2',D:'SITE-3'},siteDisplay:{'SITE-1':'Shared Site 1 (Lines A/B)','SITE-2':'Site 2 (Line C)','SITE-3':'Site 3 (Line D)'}},
  cream:{normalMaterialCodes:['MAT-CREAM-STD'],organicMaterialCodes:['MAT-CREAM-ORG'],normalDescriptionPatterns:['^STANDARD CREAM INGREDIENT\\s*$'],organicDescriptionPatterns:['^ORGANIC CREAM INGREDIENT\\b']},
  tanker:{standardLb:45000,organicLb:45000,leadHours:6,wastePct:1.5},
  receiving:{pointLabel:'Central Receiving',requiredByLabel:'Required at Central Receiving By'},
  inputAliases:{masterSheetExact:['item master'],masterSheetContains:['master'],bomSheetContains:['billdetail','bill'],ohSheetExact:['inventory'],ohSheetContains:['on hand'],scheduleFilePatterns:['production','schedule','week\\s*\\d+','wk\\d+'],bomFilePatterns:['\\bbom\\b','bill'],ohFilePatterns:['on hand','inventory','\\boh\\b'],masterFilePatterns:['item master','master']},
  excludedCodes:['CHANGEOVER','CLEANING','BREAK']
};
