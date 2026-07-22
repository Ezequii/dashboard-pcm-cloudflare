(() => {
  const body = document.body;
  const sidebar = document.getElementById('appSidebarV121');
  const openBtn = document.getElementById('btnOpenSidebarV121');
  const closeBtn = document.getElementById('btnCloseSidebarV121');
  const backdrop = document.getElementById('sidebarBackdropV121');
  if (!sidebar || !openBtn) return;

  const isOverlay = () => window.matchMedia('(max-width: 1099px)').matches;
  const setOpen = (open) => {
    const active = Boolean(open && isOverlay());
    body.classList.toggle('sidebar-open-v121', active);
    openBtn.setAttribute('aria-expanded', active ? 'true' : 'false');
    sidebar.setAttribute('aria-hidden', active || !isOverlay() ? 'false' : 'true');
    if (active) closeBtn?.focus({ preventScroll: true });
  };

  openBtn.addEventListener('click', () => setOpen(true));
  closeBtn?.addEventListener('click', () => { setOpen(false); openBtn.focus(); });
  backdrop?.addEventListener('click', () => { setOpen(false); openBtn.focus(); });

  sidebar.querySelectorAll('.tab-btn').forEach((button) => {
    button.addEventListener('click', () => {
      if (isOverlay()) setOpen(false);
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && body.classList.contains('sidebar-open-v121')) {
      setOpen(false);
      openBtn.focus();
    }
  });

  window.addEventListener('resize', () => {
    if (!isOverlay()) body.classList.remove('sidebar-open-v121');
    sidebar.setAttribute('aria-hidden', isOverlay() ? 'true' : 'false');
    openBtn.setAttribute('aria-expanded', 'false');
  }, { passive: true });

  sidebar.setAttribute('aria-hidden', isOverlay() ? 'true' : 'false');
})();
