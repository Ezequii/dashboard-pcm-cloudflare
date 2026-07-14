init().catch(err => {
  console.error('Falha crítica ao iniciar dashboard:', err);
  showPersistentError?.(err);
  showToast(err.message || 'Não foi possível iniciar o dashboard.', true);
});
