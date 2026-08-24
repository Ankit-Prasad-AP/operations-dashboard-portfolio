window.DASHBOARD_CONFIG = {
  appName: "MCO Comment Transfer & Shortage Risk Cockpit",
  dashboardSlug: "mco-comment-transfer",
  portfolioMode: true,
  confidentiality: {
    usesSyntheticDataOnly: true,
    excludesRealCompanyNames: true,
    excludesRealCustomerNames: true,
    excludesRealItemCodes: true,
    excludesRealSourceWorkbooks: true
  },
  rules: {
    qohRowLabel: "QOH",
    currentWeekLineValue: "",
    pickDateFallbackDays: 3,
    placeholderYears: {min: 1960, max: 2050},
    excludeOrderPrefixes: ["R"],
    dairyAllergenKeyword: "MILK",
    smallCanMaxOz: 7.5,
    spacerRowsAfterItem: 3
  },
  demo: {
    defaultNegativeThroughDate: "2026-08-02",
    forecastPeriods: ["P6", "P7", "P8", "P9"],
    currentWeekComment: "Current Week Production",
    nextWeekComment: "Next Week Schedule"
  }
};
