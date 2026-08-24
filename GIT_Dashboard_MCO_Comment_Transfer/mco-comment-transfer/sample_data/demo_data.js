window.SAMPLE_DATA = {
  generatedFor: "public portfolio demo",
  pa: [
    {item:"ITM-1001", itemName:"Vanilla Aerosol Topping", qoh:1200, orders:[
      {order:"SO-4101", customer:"Regional Grocery", pick:"2026-07-30", ship:"2026-08-02", qty:900},
      {order:"SO-4102", customer:"Club Channel", pick:"", ship:"2026-08-06", qty:850},
      {order:"R-PLACEHOLDER", customer:"Internal Placeholder", pick:"1955-05-05", ship:"1955-05-05", qty:1}
    ]},
    {item:"ITM-1002", itemName:"Chocolate Aerosol Topping", qoh:2400, orders:[
      {order:"SO-4201", customer:"Foodservice", pick:"2026-08-01", ship:"2026-08-04", qty:1600},
      {order:"SO-4202", customer:"Retail DC", pick:"2026-08-04", ship:"2026-08-07", qty:700}
    ]},
    {item:"ITM-1003", itemName:"Non-Dairy Coconut Whip", qoh:500, orders:[
      {order:"SO-4301", customer:"Natural Channel", pick:"", ship:"2026-08-03", qty:950},
      {order:"SO-4302", customer:"Distributor", pick:"2026-08-08", ship:"2026-08-11", qty:600}
    ]},
    {item:"ITM-1004", itemName:"Caramel Aerosol Topping", qoh:3100, orders:[
      {order:"SO-4401", customer:"Warehouse Club", pick:"2026-08-02", ship:"2026-08-05", qty:1200},
      {order:"SO-4402", customer:"Retail DC", pick:"2026-08-05", ship:"2026-08-08", qty:900}
    ]},
    {item:"ITM-1005", itemName:"Seasonal Berry Aerosol", qoh:350, orders:[
      {order:"SO-4501", customer:"Retail Launch", pick:"2026-08-01", ship:"2026-08-04", qty:725},
      {order:"SO-4502", customer:"Retail Launch", pick:"2026-08-06", ship:"2026-08-09", qty:400}
    ]},
    {item:"ITM-1006", itemName:"Cafe Cream Aerosol", qoh:850, orders:[
      {order:"SO-4601", customer:"National Retail", pick:"2026-07-31", ship:"2026-08-03", qty:500},
      {order:"SO-4602", customer:"Specialty Grocery", pick:"", ship:"2026-08-05", qty:750}
    ]},
    {item:"ITM-1007", itemName:"Oat Non-Dairy Topping", qoh:1600, orders:[
      {order:"SO-4701", customer:"Natural Channel", pick:"2026-08-02", ship:"2026-08-05", qty:850},
      {order:"SO-4702", customer:"Retail DC", pick:"2026-08-07", ship:"2026-08-10", qty:620}
    ]},
    {item:"ITM-1008", itemName:"Large Can Vanilla Foodservice", qoh:900, orders:[
      {order:"SO-4801", customer:"Foodservice", pick:"2026-08-01", ship:"2026-08-04", qty:1400},
      {order:"SO-4802", customer:"Distributor", pick:"2026-08-05", ship:"2026-08-08", qty:700},
      {order:"R-2055", customer:"Internal Placeholder", pick:"2055-05-05", ship:"2055-05-05", qty:1}
    ]},
    {item:"ITM-1009", itemName:"Pumpkin Spice Seasonal", qoh:260, orders:[
      {order:"SO-4901", customer:"Seasonal Program", pick:"2026-08-02", ship:"2026-08-05", qty:520},
      {order:"SO-4902", customer:"Seasonal Program", pick:"2026-08-04", ship:"2026-08-07", qty:480}
    ]},
    {item:"ITM-1010", itemName:"Sugar-Free Vanilla", qoh:1900, orders:[
      {order:"SO-5001", customer:"Regional Grocery", pick:"2026-07-29", ship:"2026-08-01", qty:650},
      {order:"SO-5002", customer:"Retail DC", pick:"2026-08-03", ship:"2026-08-06", qty:700}
    ]}
  ],
  forecast: {
    "ITM-1001": {P6:1800, P7:2200, P8:2500, P9:2100, formula:"FM-101"},
    "ITM-1002": {P6:2600, P7:2400, P8:2300, P9:2250, formula:"FM-102"},
    "ITM-1003": {P6:1400, P7:1600, P8:1750, P9:1800, formula:"FM-203"},
    "ITM-1004": {P6:3000, P7:3200, P8:3100, P9:2900, formula:"FM-104"},
    "ITM-1005": {P6:1100, P7:1300, P8:1500, P9:900, formula:"FM-301"},
    "ITM-1006": {P6:1350, P7:1550, P8:1720, P9:1660, formula:"FM-118"},
    "ITM-1007": {P6:2100, P7:2250, P8:2300, P9:2400, formula:"FM-240"},
    "ITM-1008": {P6:1600, P7:1900, P8:2200, P9:2150, formula:"FM-101"},
    "ITM-1009": {P6:700, P7:1200, P8:1900, P9:2100, formula:"FM-330"},
    "ITM-1010": {P6:1900, P7:2000, P8:2050, P9:1980, formula:"FM-112"}
  },
  itemMaster: {
    "ITM-1001": {expiryDays:120, allergens:"Milk", canOz:6.5, historicalLines:["A","B"]},
    "ITM-1002": {expiryDays:120, allergens:"Milk", canOz:7.0, historicalLines:["A","C"]},
    "ITM-1003": {expiryDays:90, allergens:"Coconut", canOz:6.5, historicalLines:["B","D"]},
    "ITM-1004": {expiryDays:120, allergens:"Milk", canOz:15.0, historicalLines:["C"]},
    "ITM-1005": {expiryDays:60, allergens:"Milk", canOz:6.5, historicalLines:["A","B","C"]},
    "ITM-1006": {expiryDays:105, allergens:"Milk", canOz:6.5, historicalLines:["B"]},
    "ITM-1007": {expiryDays:90, allergens:"Oat", canOz:6.5, historicalLines:["B","D"]},
    "ITM-1008": {expiryDays:120, allergens:"Milk", canOz:15.0, historicalLines:["C","D"]},
    "ITM-1009": {expiryDays:75, allergens:"Milk", canOz:6.5, historicalLines:["A","B"]},
    "ITM-1010": {expiryDays:120, allergens:"Milk", canOz:7.0, historicalLines:["A","C"]}
  },
  currentWeekProduction: [
    {comment:"Current Week Production", line:"", item:"ITM-1001", qty:700},
    {comment:"Current Week Production", line:"", item:"ITM-1003", qty:400},
    {comment:"Current Week Production", line:"", item:"ITM-1005", qty:300},
    {comment:"Current Week Production", line:"", item:"ITM-1006", qty:420},
    {comment:"Current Week Production", line:"", item:"ITM-1009", qty:280}
  ],
  scheduledProduction: [
    {comment:"Next Week Schedule", line:"1A", item:"ITM-1001", qty:650},
    {comment:"Next Week Schedule", line:"2C", item:"ITM-1004", qty:1100},
    {comment:"Next Week Schedule", line:"3B", item:"ITM-1005", qty:400},
    {comment:"Next Week Schedule", line:"4B", item:"ITM-1007", qty:700},
    {comment:"Next Week Schedule", line:"2D", item:"ITM-1008", qty:800},
    {comment:"Next Week Schedule", line:"5A", item:"ITM-1010", qty:350}
  ]
};
