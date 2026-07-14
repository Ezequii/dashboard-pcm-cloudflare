'use strict';

function showToast(message, error=false, duration=3600){
  const el = $('toast');
  if(!el) return;
  el.textContent = String(message || '');
  el.className = `toast show${error ? ' err' : ''}`;
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => { el.className = 'toast'; }, duration);
}

function debounce(fn, ms=300){
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function escapeHtml(value){
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;',
  })[char]);
}

function escapeAttr(value){
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function normalizeText(value){
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

function cleanText(value){
  const text = String(value ?? '').trim();
  return ['NAN','NAT','NONE','NULL','N/A'].includes(text.toUpperCase()) ? '' : text;
}

function stageClass(name){
  const normalized = normalizeText(name);
  if(normalized.includes('SEM LANCAMENTO')) return 'stage-red';
  if(normalized.includes('SEM PEDIDO')) return 'stage-amber';
  if(normalized.includes('SEM NF')) return 'stage-blue';
  if(normalized.includes('CONCLUIDO')) return 'stage-green';
  return 'stage-gray';
}

function formatNumber(value){
  return Number(value || 0).toLocaleString('pt-BR');
}

function formatPercent(value, digits=1){
  return `${Number(value || 0).toFixed(digits).replace('.', ',')}%`;
}

function formatMoney(value, compact=false){
  const number = Number(value || 0);
  if(compact){
    const abs = Math.abs(number);
    if(abs >= 1_000_000_000) return `R$ ${(number/1_000_000_000).toFixed(1).replace('.', ',')} bi`;
    if(abs >= 1_000_000) return `R$ ${(number/1_000_000).toFixed(1).replace('.', ',')} mi`;
    if(abs >= 1_000) return `R$ ${(number/1_000).toFixed(0).replace('.', ',')} mil`;
  }
  return number.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
}

function parseMoney(value){
  if(typeof value === 'number') return Number.isFinite(value) ? value : 0;
  let clean = String(value ?? '').replace(/R\$/gi, '').replace(/\s/g, '').replace(/[^0-9,.-]/g, '');
  if(clean.includes(',')) clean = clean.replace(/\./g, '').replace(',', '.');
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDateIso(value){
  const text = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

function daysBetween(isoDate, now=new Date()){
  const iso = parseDateIso(isoDate);
  if(!iso) return 0;
  const start = new Date(`${iso}T00:00:00`);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.floor((end - start) / 86400000);
  return Math.max(0, diff);
}

function ageTone(days){
  const n = Number(days || 0);
  if(n >= BUSINESS_RULES.aging.severe) return 'severe';
  if(n >= BUSINESS_RULES.aging.critical) return 'critical';
  if(n >= BUSINESS_RULES.aging.high) return 'high';
  if(n >= BUSINESS_RULES.aging.attention) return 'attention';
  return 'ok';
}

function copyText(text){
  const value = String(text || '');
  if(navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const area = document.createElement('textarea');
  area.value = value;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  area.remove();
  return Promise.resolve();
}

function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFilename(value){
  return String(value || 'arquivo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100) || 'arquivo';
}

function setText(id, text, title=''){
  const el = $(id);
  if(!el) return;
  el.textContent = String(text ?? '');
  if(title) el.title = title;
}

function setHidden(id, hidden){
  const el = $(id);
  if(el) el.hidden = Boolean(hidden);
}

function setBusy(isBusy){
  document.body.classList.toggle('is-loading', Boolean(isBusy));
  document.querySelectorAll('[data-disable-while-loading]').forEach(el => {
    el.disabled = Boolean(isBusy);
  });
}
