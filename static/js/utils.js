function showToast(message, error=false){
  const el = $('toast');
  if(!el) return;
  el.textContent = message;
  el.className = 'toast show' + (error ? ' err' : '');
  window.clearTimeout(el._hideTimer);
  el._hideTimer = window.setTimeout(() => { el.className = 'toast'; }, 3600);
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
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function stageClass(name){
  const normalized = String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
  if(normalized.includes('SEM LANCAMENTO')) return 'stage-red';
  if(normalized.includes('SEM PEDIDO')) return 'stage-amber';
  if(normalized.includes('SEM NF')) return 'stage-blue';
  if(normalized.includes('CONCLUIDO')) return 'stage-green';
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

function escapeHtml(value){
  return String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    "'":'&#39;',
    '"':'&quot;'
  }[character]));
}

function escapeAttr(value){
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function parseIsoDate(value){
  const text = String(value || '').trim();
  if(!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function relativeDataAge(value){
  const date = parseIsoDate(value);
  if(!date) return {label:'data desconhecida', hours:null, tone:'unknown'};
  const ageMs = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(ageMs / 60000);
  const hours = ageMs / 3600000;
  if(minutes < 2) return {label:'atualizada agora', hours, tone:'fresh'};
  if(minutes < 60) return {label:`atualizada há ${minutes} min`, hours, tone:'fresh'};
  const roundedHours = Math.floor(hours);
  if(hours < 24) return {
    label:`atualizada há ${roundedHours} h`,
    hours,
    tone: hours >= 8 ? 'warning' : 'fresh'
  };
  const days = Math.floor(hours / 24);
  return {
    label:`atualizada há ${days} dia${days === 1 ? '' : 's'}`,
    hours,
    tone:'stale'
  };
}

function updateDataFreshness(generatedAt){
  state.generatedAt = generatedAt || state.generatedAt || '';
  const host = $('dataFreshness');
  if(!host) return;
  const age = relativeDataAge(state.generatedAt);
  host.className = `data-freshness-v97 is-${age.tone}`;
  host.innerHTML = `<i aria-hidden="true"></i><span>${escapeHtml(age.label)}</span>`;
  const full = parseIsoDate(state.generatedAt);
  host.title = full
    ? `Base gerada em ${full.toLocaleString('pt-BR', {dateStyle:'short', timeStyle:'short'})}`
    : 'A data de geração da base não foi informada';

  if(age.tone === 'stale'){
    showDataStatus(
      'Base desatualizada',
      `${age.label}. Recarregue o painel ou confirme se houve uma nova publicação.`,
      'warning'
    );
  }else if(state.lastError === ''){
    hideDataStatus();
  }
}

function showDataStatus(title, message, tone='error'){
  state.lastError = tone === 'error' ? String(message || title || '') : state.lastError;
  const banner = $('dataStatusBanner');
  if(!banner) return;
  banner.hidden = false;
  banner.className = `data-status-banner-v97 no-print tone-${tone}`;
  const titleEl = $('dataStatusTitle');
  const messageEl = $('dataStatusMessage');
  if(titleEl) titleEl.textContent = title || 'Atenção';
  if(messageEl) messageEl.textContent = message || '';
  const retry = $('btnRetryData');
  if(retry) retry.hidden = tone !== 'error' && tone !== 'warning';
}

function hideDataStatus(force=false){
  if(!force && state.lastError) return;
  const banner = $('dataStatusBanner');
  if(banner) banner.hidden = true;
}

function clearDataError(){
  state.lastError = '';
  const age = relativeDataAge(state.generatedAt);
  if(age.tone === 'stale'){
    showDataStatus(
      'Base desatualizada',
      `${age.label}. Recarregue o painel ou confirme se houve uma nova publicação.`,
      'warning'
    );
  }else{
    hideDataStatus(true);
  }
}
