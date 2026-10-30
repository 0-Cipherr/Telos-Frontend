const endpoints = {
  // Creators
  uploadCreator: "/creator",

  // Vaults
  updloadVaults: "/add/vault",
  allVaults: "/all",
  vaultById: "/id",

  // Agents
  uploadAgent: "/agent",

  // Vault Holders
  vaultHolders: "/holders",
  uploadVaultHolder: "/holders",

  // Strategies
  allStrategies: "/strategy/all",
  currentStrategy: "/strategy/current",
  updateCurrentStrategy: "/strategy/current",

  // Metrics
  updateMetrics: "/metrics/update",
};

export default endpoints;
