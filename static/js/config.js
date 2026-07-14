/* V97 — configuração central de regras operacionais e comportamento do dashboard. */
const APP_VERSION = '97';

const BUSINESS_RULES = Object.freeze({
  aging: Object.freeze({
    attention: 8,
    high: 16,
    critical: 30,
    severe: 60,
  }),
  targets: Object.freeze({
    completionPercent: 95,
    maxPcmQueue: 40,
    staleDataHours: 24,
  }),
  priorityWeights: Object.freeze({
    stage: 0.60,
    age: 0.20,
    value: 0.15,
    quantity: 0.05,
  }),
  refresh: Object.freeze({
    versionCheckMs: 5 * 60 * 1000,
    dashboardCacheMs: 2 * 60 * 1000,
  }),
});

const PENDING_STAGES = Object.freeze(['SEM LANÇAMENTO', 'SEM PEDIDO', 'SEM NF']);
