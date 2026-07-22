(() => {
  const body = document.body;
  const sidebar = document.getElementById('appSidebarV120');
  const openBtn = document.getElementById('btnOpenSidebarV120');
  const closeBtn = document.getElementById('btnCloseSidebarV120');
  const backdrop = document.getElementById('sidebarBackdropV120');
  if (!sidebar || !openBtn) return;

  const isOverlay = () => window.matchMedia('(max-width: 1099px)').matches;
  const setOpen = (open) => {
    const active = Boolean(open && isOverlay());
    body.classList.toggle('sidebar-open-v120', active);
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
    if (event.key === 'Escape' && body.classList.contains('sidebar-open-v120')) {
      setOpen(false);
      openBtn.focus();
    }
  });

  window.addEventListener('resize', () => {
    if (!isOverlay()) body.classList.remove('sidebar-open-v120');
    sidebar.setAttribute('aria-hidden', isOverlay() ? 'true' : 'false');
    openBtn.setAttribute('aria-expanded', 'false');
  }, { passive: true });

  const collapseBtn = document.getElementById('btnCollapseSidebarV120');
  const collapseKey = 'pcm.sidebar.collapsed.v120';
  const applyCollapsed = (collapsed) => {
    const active = Boolean(collapsed && !isOverlay());
    body.classList.toggle('sidebar-collapsed-v120', active);
    collapseBtn?.setAttribute('aria-expanded', active ? 'false' : 'true');
    collapseBtn?.setAttribute('aria-label', active ? 'Expandir menu lateral' : 'Recolher menu lateral');
  };
  try { applyCollapsed(localStorage.getItem(collapseKey) === '1'); } catch (_) { applyCollapsed(false); }
  collapseBtn?.addEventListener('click', () => {
    const next = !body.classList.contains('sidebar-collapsed-v120');
    applyCollapsed(next);
    try { localStorage.setItem(collapseKey, next ? '1' : '0'); } catch (_) {}
  });

  sidebar.setAttribute('aria-hidden', isOverlay() ? 'true' : 'false');
})();
