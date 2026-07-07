function showToast(message, error=false){
  const el = $('toast');
  if(!el) return;
  el.textContent = message;
  el.className = 'toast show' + (error ? ' err' : '');
  setTimeout(() => { el.className = 'toast'; }, 3200);
}

function nowClock(){
  const el = $('clock');
  if(!el) return;
  const d = new Date();
  const date = d.toLocaleDateString('pt-BR', {weekday:'short', day:'2-digit', month:'2-digit'});
  el.textContent = `${date} • ${d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}`;
}
setInterval(nowClock, 1000);

function debounce(fn, ms=300){
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function stageClass(name){
  const n = String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  if(n.includes('SEM LANCAMENTO')) return 'stage-red';
  if(n.includes('SEM PEDIDO')) return 'stage-amber';
  if(n.includes('SEM NF')) return 'stage-blue';
  if(n.includes('CONCLUIDO')) return 'stage-green';
  return 'stage-gray';
}

function hexToRgba(hex, alpha){
  const h = String(hex || '').replace('#','');
  if(h.length !== 6) return `rgba(0,98,158,${alpha})`;
  const r = parseInt(h.slice(0,2), 16);
  const g = parseInt(h.slice(2,4), 16);
  const b = parseInt(h.slice(4,6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function escapeHtml(v){ return String(v ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }
function escapeAttr(v){ return escapeHtml(v).replace(/`/g, '&#96;'); }
