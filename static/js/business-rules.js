'use strict';

const BUSINESS_RULES = Object.freeze({
  version: '100.0.0',
  aging: Object.freeze({
    attention: 8,
    high: 16,
    critical: 30,
    severe: 60,
  }),
  targets: Object.freeze({
    completionPercent: 95,
    maxPcmQueue: 40,
    staleAfterHours: 24,
  }),
  priorityWeights: Object.freeze({
    stage: 0.60,
    age: 0.20,
    value: 0.15,
    quantity: 0.05,
  }),
  stageWeights: Object.freeze({
    'SEM LANÇAMENTO': 1.00,
    'SEM PEDIDO': 0.48,
    'SEM NF': 0.40,
    'CONCLUÍDO': 0,
  }),
  values: Object.freeze({
    high: 100000,
    critical: 250000,
  }),
  stageOrder: Object.freeze(['SEM LANÇAMENTO', 'SEM PEDIDO', 'SEM NF', 'CONCLUÍDO']),
  stageColors: Object.freeze({
    'SEM LANÇAMENTO': '#C83A3A',
    'SEM PEDIDO': '#B97800',
    'SEM NF': '#00629E',
    'CONCLUÍDO': '#14804A',
  }),
});
