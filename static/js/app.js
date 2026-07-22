
(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const integer = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
  const oneDecimal = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const statusOrder = ["FALTA LANÇAMENTO", "FALTA O PEDIDO", "FALTA NF", "CONCLUÍDO"];
  const statusClass = {
    "FALTA LANÇAMENTO": "danger",
    "FALTA O PEDIDO": "warning",
    "FALTA NF": "info",
    "CONCLUÍDO": "success",
  };

  const state = {
    dataset: null,
    rows: [],
    filters: { search: "", status: "", fornecedor: "", solicitante: "", mes: "" },
    tableSearch: "",
    page: 1,
    pageSize: 30,
    sort: { key: "dataRecebimento", direction: "desc" },
    selected: null,
    drawerRows: [],
    currentFile: null,
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDate(date) {
    return date instanceof Date && !Number.isNaN(date.getTime())
      ? date.toLocaleDateString("pt-BR")
      : "—";
  }

  function monthKey(date) {
    if (!(date instanceof Date)) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function monthLabel(key) {
    const [year, month] = key.split("-").map(Number);
    if (!year || !month) return key;
    return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" })
      .format(new Date(year, month - 1, 1))
      .replace(".", "");
  }

  function normalizeSearch(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR");
  }

  function isPending(row) {
    return row.status === "FALTA LANÇAMENTO";
  }

  function average(values) {
    const valid = values.filter(value => Number.isFinite(value));
    return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0;
  }

  function countBy(rows, selector) {
    const map = new Map();
    rows.forEach(row => {
      const key = String(selector(row) || "Não informado").trim() || "Não informado";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, "pt-BR"));
  }

  function backlogBand(days) {
    if (!Number.isFinite(days)) return "Sem data";
    if (days <= 2) return "0–2 dias";
    if (days <= 5) return "3–5 dias";
    if (days <= 10) return "6–10 dias";
    return "11+ dias";
  }

  function matchesFilters(row) {
    const f = state.filters;
    if (f.status && row.status !== f.status) return false;
    if (f.fornecedor && row.fornecedor !== f.fornecedor) return false;
    if (f.solicitante && row.solicitante !== f.solicitante) return false;
    if (f.mes && monthKey(row.dataRecebimento) !== f.mes) return false;
    if (f.search) {
      const haystack = normalizeSearch([
        row.numeroOrc, row.numeroRequisicao, row.numeroOs, row.numeroPedido, row.numeroNfs,
        row.prefixo, row.equipamento, row.fornecedor, row.solicitante, row.status, row.observacoes
      ].join(" "));
      if (!haystack.includes(normalizeSearch(f.search))) return false;
    }
    return true;
  }

  function filteredRows() {
    return state.rows.filter(matchesFilters);
  }

  function applyFilter(key, value) {
    state.filters[key] = value;
    const element = $(`#filter${key.charAt(0).toUpperCase()}${key.slice(1)}`);
    if (element) element.value = value;
    if (key === "search") $("#globalSearch").value = value;
    state.page = 1;
    renderAll();
  }

  function resetFilters() {
    state.filters = { search: "", status: "", fornecedor: "", solicitante: "", mes: "" };
    $("#globalSearch").value = "";
    $("#filterStatus").value = "";
    $("#filterFornecedor").value = "";
    $("#filterSolicitante").value = "";
    $("#filterMes").value = "";
    state.page = 1;
    renderAll();
  }

  function populateFilterOptions() {
    const rows = state.rows;
    const fill = (selector, values) => {
      const select = $(selector);
      select.innerHTML = `<option value="">Todos</option>` + values
        .map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
    };
    const unique = fn => [...new Set(rows.map(fn).filter(v => v && v !== "Não informado"))]
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
    fill("#filterStatus", unique(row => row.status));
    fill("#filterFornecedor", unique(row => row.fornecedor));
    fill("#filterSolicitante", unique(row => row.solicitante));
    const months = [...new Set(rows.map(row => monthKey(row.dataRecebimento)).filter(Boolean))].sort().reverse();
    $("#filterMes").innerHTML = `<option value="">Todos</option>` +
      months.map(value => `<option value="${value}">${escapeHtml(monthLabel(value))}</option>`).join("");
  }

  function renderActiveFilters() {
    const container = $("#activeFilters");
    const labels = { search: "Busca", status: "Status", fornecedor: "Fornecedor", solicitante: "Solicitante", mes: "Mês" };
    const entries = Object.entries(state.filters).filter(([, value]) => value);
    container.hidden = entries.length === 0;
    container.innerHTML = entries.map(([key, value]) => {
      const shown = key === "mes" ? monthLabel(value) : value;
      return `<button type="button" data-clear-filter="${key}"><span>${labels[key]}:</span><strong>${escapeHtml(shown)}</strong> ×</button>`;
    }).join("");
    $$("[data-clear-filter]", container).forEach(button => {
      button.addEventListener("click", () => applyFilter(button.dataset.clearFilter, ""));
    });
  }

  function renderKpis(rows) {
    const pending = rows.filter(isPending);
    const pendingValue = pending.reduce((sum, row) => sum + row.valorTotal, 0);
    const wait = average(pending.map(row => row.diasAguardando).filter(Number.isFinite));
    const lead = average(rows.map(row => row.leadTimeLancamento).filter(Number.isFinite));
    $("#kpiTotal").textContent = integer.format(rows.length);
    $("#kpiPending").textContent = integer.format(pending.length);
    $("#kpiPendingSub").textContent = `${oneDecimal.format(wait)} dias de espera média`;
    $("#kpiPendingValue").textContent = brl.format(pendingValue);
    $("#kpiLeadTime").textContent = `${oneDecimal.format(lead)} dias`;
  }

  function renderStages(rows) {
    const container = $("#stageGrid");
    container.innerHTML = statusOrder.map(status => {
      const stageRows = rows.filter(row => row.status === status);
      const total = stageRows.reduce((sum, row) => sum + row.valorTotal, 0);
      return `<button class="stage-card ${statusClass[status] || ""}" type="button" data-stage="${escapeHtml(status)}">
        <span>${escapeHtml(status)}</span>
        <strong>${integer.format(stageRows.length)}</strong>
        <em>${brl.format(total)}</em>
      </button>`;
    }).join("");
    $$("[data-stage]", container).forEach(button =>
      button.addEventListener("click", () => applyFilter("status", button.dataset.stage))
    );
  }

  function renderBarChart(selector, data, filterKey, supplier = false) {
    const container = $(selector);
    const max = Math.max(...data.map(item => item.value), 1);
    container.classList.toggle("supplier", supplier);
    if (!data.length) {
      container.innerHTML = `<div class="empty-state">Sem dados para o contexto atual.</div>`;
      return;
    }
    container.innerHTML = data.map(item => `
      <button class="bar-row" type="button" data-filter-value="${escapeHtml(item.name)}">
        <span class="bar-label" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
        <span class="bar-track"><span style="width:${Math.max(4, item.value / max * 100)}%"></span></span>
        <strong class="bar-value">${integer.format(item.value)}</strong>
      </button>
    `).join("");
    $$("[data-filter-value]", container).forEach(button =>
      button.addEventListener("click", () => applyFilter(filterKey, button.dataset.filterValue))
    );
  }

  function renderAgeChart(pending) {
    const order = ["0–2 dias", "3–5 dias", "6–10 dias", "11+ dias"];
    const map = new Map(countBy(pending, row => backlogBand(row.diasAguardando)).map(item => [item.name, item.value]));
    const data = order.map(name => ({ name, value: map.get(name) || 0 }));
    const max = Math.max(...data.map(item => item.value), 1);
    $("#ageChart").innerHTML = data.map(item => `
      <div class="column-item">
        <div class="column-plot"><span style="height:${Math.max(3, item.value / max * 90)}%"><strong>${integer.format(item.value)}</strong></span></div>
        <div class="column-label">${escapeHtml(item.name)}</div>
      </div>
    `).join("");
  }

  function renderTimeline(rows) {
    const map = new Map();
    rows.forEach(row => {
      const received = monthKey(row.dataRecebimento);
      const launched = monthKey(row.dataLancamento);
      if (received) {
        const item = map.get(received) || { month: received, received: 0, launched: 0 };
        item.received += 1; map.set(received, item);
      }
      if (launched) {
        const item = map.get(launched) || { month: launched, received: 0, launched: 0 };
        item.launched += 1; map.set(launched, item);
      }
    });
    const data = [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
    const container = $("#timelineChart");
    if (!data.length) {
      container.innerHTML = `<div class="empty-state">Sem datas no contexto atual.</div>`;
      return;
    }
    const width = 640, height = 220, padX = 38, padY = 28;
    const max = Math.max(...data.flatMap(item => [item.received, item.launched]), 1);
    const x = index => data.length === 1 ? width / 2 : padX + index * ((width - padX * 2) / (data.length - 1));
    const y = value => height - padY - value / max * (height - padY * 2);
    const points = key => data.map((item, index) => `${x(index)},${y(item[key])}`).join(" ");
    const labels = data.map((item, index) =>
      `<text x="${x(index)}" y="${height - 7}" text-anchor="middle" fill="#64748b" font-size="10">${escapeHtml(monthLabel(item.month))}</text>`
    ).join("");
    const dots = (key, cls) => data.map((item, index) =>
      `<circle cx="${x(index)}" cy="${y(item[key])}" r="3.5" class="${cls}"><title>${item[key]}</title></circle>`
    ).join("");
    container.innerHTML = `
      <div class="timeline-legend"><span><i style="background:#3b82f6"></i>Recebidos</span><span><i style="background:#22c55e"></i>Lançados</span></div>
      <svg class="timeline-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Recebimentos e lançamentos por mês">
        <line x1="${padX}" y1="${height - padY}" x2="${width - padX}" y2="${height - padY}" class="timeline-grid"/>
        <line x1="${padX}" y1="${padY}" x2="${padX}" y2="${height - padY}" class="timeline-grid"/>
        <polyline points="${points("received")}" class="timeline-line-received"/>
        <polyline points="${points("launched")}" class="timeline-line-launched"/>
        ${dots("received", "timeline-dot-r")}
        ${dots("launched", "timeline-dot-l")}
        ${labels}
      </svg>`;
  }

  function actionQueue(rows) {
    return rows.filter(isPending)
      .sort((a, b) => (b.diasAguardando || -1) - (a.diasAguardando || -1) || b.valorTotal - a.valorTotal)
      .slice(0, 12);
  }

  function renderActions(rows) {
    const queue = actionQueue(rows);
    const container = $("#actionList");
    if (!queue.length) {
      container.innerHTML = `<div class="empty-state">Nenhuma ORC pendente de lançamento no contexto atual.</div>`;
      return;
    }
    container.innerHTML = queue.map((row, index) => `
      <button class="action-row" type="button" data-open-id="${escapeHtml(row.id)}">
        <span class="action-rank">${index + 1}</span>
        <span class="action-main"><strong>ORC ${escapeHtml(row.numeroOrc)}</strong><small>${escapeHtml(row.fornecedor)} · ${escapeHtml(row.equipamento)}</small></span>
        <span><small>Solicitante</small><strong>${escapeHtml(row.solicitante)}</strong></span>
        <span><small>Recebida</small><strong>${formatDate(row.dataRecebimento)}</strong></span>
        <span class="age-badge"><strong>${row.diasAguardando ?? 0}</strong><small>dias</small></span>
        <span class="value-cell">${brl.format(row.valorTotal)}</span>
      </button>
    `).join("");
    $$("[data-open-id]", container).forEach(button =>
      button.addEventListener("click", () => openDrawer(queue.find(row => row.id === button.dataset.openId), queue))
    );
  }

  function renderOverview(rows) {
    renderKpis(rows);
    renderStages(rows);
    const pending = rows.filter(isPending);
    renderBarChart("#requesterChart", countBy(pending, row => row.solicitante).filter(item => item.name !== "Não informado").slice(0, 8), "solicitante");
    renderBarChart("#supplierChart", countBy(pending, row => row.fornecedor).filter(item => item.name !== "Não informado").slice(0, 10), "fornecedor", true);
    renderAgeChart(pending);
    renderTimeline(rows);
    renderActions(rows);
  }

  function tableRows() {
    const q = normalizeSearch(state.tableSearch);
    const rows = filteredRows().filter(row => {
      if (!q) return true;
      return normalizeSearch([
        row.numeroOrc, row.numeroRequisicao, row.numeroOs, row.numeroPedido, row.numeroNfs,
        row.prefixo, row.equipamento, row.fornecedor, row.solicitante, row.status, row.observacoes
      ].join(" ")).includes(q);
    });
    const { key, direction } = state.sort;
    return rows.sort((a, b) => {
      const av = a[key], bv = b[key];
      let compare = 0;
      if (av instanceof Date && bv instanceof Date) compare = av.getTime() - bv.getTime();
      else if (typeof av === "number" && typeof bv === "number") compare = av - bv;
      else compare = String(av ?? "").localeCompare(String(bv ?? ""), "pt-BR", { numeric: true });
      return direction === "asc" ? compare : -compare;
    });
  }

  function statusPill(status) {
    return `<span class="status-pill ${statusClass[status] || "info"}">${escapeHtml(status)}</span>`;
  }

  function renderTable() {
    const rows = tableRows();
    const pages = Math.max(1, Math.ceil(rows.length / state.pageSize));
    state.page = Math.min(Math.max(1, state.page), pages);
    const start = (state.page - 1) * state.pageSize;
    const current = rows.slice(start, start + state.pageSize);
    $("#tableCount").textContent = `${integer.format(rows.length)} registros`;
    $("#pageInfo").textContent = `Página ${state.page} de ${pages}`;
    $("#prevPage").disabled = state.page <= 1;
    $("#nextPage").disabled = state.page >= pages;

    $("#tableBody").innerHTML = current.length ? current.map(row => `
      <tr data-row-id="${escapeHtml(row.id)}">
        <td>${formatDate(row.dataRecebimento)}</td>
        <td>${formatDate(row.dataLancamento)}</td>
        <td class="mono">${escapeHtml(row.numeroOrc)}</td>
        <td>${escapeHtml(row.fornecedor)}</td>
        <td>${escapeHtml(row.solicitante)}</td>
        <td class="mono">${escapeHtml(row.prefixo)}</td>
        <td class="description-cell" title="${escapeHtml(row.equipamento)}">${escapeHtml(row.equipamento)}</td>
        <td class="mono">${escapeHtml(row.numeroRequisicao)}</td>
        <td class="mono">${escapeHtml(row.numeroPedido)}</td>
        <td>${brl.format(row.valorTotal)}</td>
        <td>${statusPill(row.status)}</td>
        <td>${Number.isFinite(row.diasAguardando) ? `${row.diasAguardando} d` : "—"}</td>
        <td><button class="table-detail-button" type="button" data-detail-id="${escapeHtml(row.id)}" aria-label="Abrir detalhes da ORC ${escapeHtml(row.numeroOrc)}">⌕</button></td>
      </tr>
    `).join("") : `<tr><td colspan="13" class="table-empty">Nenhum registro encontrado.</td></tr>`;

    $$("[data-detail-id]", $("#tableBody")).forEach(button =>
      button.addEventListener("click", () => openDrawer(rows.find(row => row.id === button.dataset.detailId), rows))
    );
  }

  function renderBadge(rows) {
    $("#datasetBadge").textContent = `${integer.format(rows.length)} de ${integer.format(state.rows.length)} registros`;
  }

  function renderAll() {
    if (!state.dataset) return;
    const rows = filteredRows();
    renderBadge(rows);
    renderActiveFilters();
    renderOverview(rows);
    renderTable();
  }

  function details(row) {
    return [
      ["Data de recebimento", formatDate(row.dataRecebimento), true],
      ["Data lançamento", formatDate(row.dataLancamento), true],
      ["Prefixo", row.prefixo, true],
      ["Equipamento", row.equipamento, false],
      ["Fornecedor", row.fornecedor, true],
      ["Nº orçamento final", row.numeroOrc, true],
      ["Valor serviço", brl.format(row.valorServico), false],
      ["Valor peças", brl.format(row.valorPecas), false],
      ["Valor total", brl.format(row.valorTotal), true],
      ["Solicitante", row.solicitante, true],
      ["Nº ordem serviço", row.numeroOs, false],
      ["Nº requisição", row.numeroRequisicao, true],
      ["Nº pedido de compra", row.numeroPedido, true],
      ["Data do pedido", row.dataPedido || "Não informado", false],
      ["Nº NFs / DANFE", row.numeroNfs, false],
      ["Data lançamento NFs", row.dataLancamentoNfs || "Não informado", false],
      ["Status", row.status, true],
      ["Observações adicionais", row.observacoes || "Não informado", false],
    ];
  }

  function openDrawer(row, contextRows) {
    if (!row) return;
    state.selected = row;
    state.drawerRows = contextRows || [row];
    $("#drawerTitle").textContent = `ORC ${row.numeroOrc}`;
    $("#drawerSubtitle").textContent = `${row.fornecedor} · ${row.equipamento}`;
    $("#drawerSummary").innerHTML = `
      <div><span>Status</span><strong>${escapeHtml(row.status)}</strong></div>
      <div><span>${row.status === "FALTA LANÇAMENTO" ? "Aguardando" : "Tempo p/ lançamento"}</span><strong>${Number.isFinite(row.diasAguardando) ? `${row.diasAguardando} dias` : "—"}</strong></div>
      <div><span>Valor total</span><strong>${brl.format(row.valorTotal)}</strong></div>`;
    $("#detailGrid").innerHTML = details(row).map(([label, value, priority]) =>
      `<div class="detail-field ${priority ? "priority" : ""}"><span>${escapeHtml(label)}</span><strong class="${value === "Não informado" ? "empty" : ""}">${escapeHtml(value)}</strong></div>`
    ).join("");
    const index = state.drawerRows.findIndex(item => item.id === row.id);
    $("#drawerPrev").disabled = index <= 0;
    $("#drawerNext").disabled = index < 0 || index >= state.drawerRows.length - 1;
    $("#drawerOverlay").hidden = false;
    document.body.style.overflow = "hidden";
    setTimeout(() => $("#closeDrawer").focus(), 0);
  }

  function closeDrawer() {
    $("#drawerOverlay").hidden = true;
    state.selected = null;
    state.drawerRows = [];
    document.body.style.overflow = "";
  }

  function moveDrawer(delta) {
    if (!state.selected) return;
    const index = state.drawerRows.findIndex(row => row.id === state.selected.id);
    const next = state.drawerRows[index + delta];
    if (next) openDrawer(next, state.drawerRows);
  }

  function setView(view) {
    const overview = view === "overview";
    $("#overviewView").hidden = !overview;
    $("#consultaView").hidden = overview;
    $$(".nav-item").forEach(button => button.classList.toggle("is-active", button.dataset.view === view));
    history.replaceState(null, "", overview ? "#overview" : "#consulta");
    if (!overview) renderTable();
  }

  function loadDataset(dataset) {
    state.dataset = dataset;
    state.rows = dataset.rows;
    state.filters = { search: "", status: "", fornecedor: "", solicitante: "", mes: "" };
    state.tableSearch = "";
    state.page = 1;
    state.selected = null;
    $("#tableSearch").value = "";
    $("#uploadScreen").hidden = true;
    $("#appShell").hidden = false;
    populateFilterOptions();
    resetFilters();
    setView(location.hash === "#consulta" ? "consulta" : "overview");
  }

  function demoDataset() {
    const d = day => new Date(2026, 6, day);
    const today = new Date(2026, 6, 22);
    const base = [
      [3, null, "61521061", "ÔNIBUS MERCEDES BENZ", "CAMPO ERE", "54525", 4898.34, "EDUARDO PALMA", "835075", "FALTA LANÇAMENTO"],
      [7, null, "13130037", "PULV AUTOPROP JOHN DEERE M4030", "ASTER MAQUINAS", "42107", 2443.59, "KAMYLLA SANTOS", "834744", "FALTA LANÇAMENTO"],
      [16, 17, "81521316", "PLANT GRÃOS JOHN DEERE DB90", "CNP PELICULAS", "654", 4900, "QUEZIA LEAL", "833348", "FALTA NF"],
      [14, 15, "81519219", "PLANT GRÃOS JOHN DEERE DB90", "CNP PELICULAS", "653", 4900, "QUEZIA LEAL", "833348", "FALTA O PEDIDO"],
      [10, 11, "61521083", "CAM COMBOIO VOLVO VM 330", "CAMPO ERE", "54531", 6811.13, "EDUARDO PALMA", "834504", "CONCLUÍDO"],
      [8, 9, "12060003", "ÔNIBUS MARCOPOLO", "CAMPO ERE", "54507", 3242.28, "EDUARDO PALMA", "834539", "CONCLUÍDO"],
      [2, null, "85048095", "CENTRO DE CUSTO", "CNP PELICULAS", "660", 5800, "QUEZIA LEAL", "833725", "FALTA LANÇAMENTO"],
      [18, 19, "1726243", "YAMAHA XTZ150 CROSSER", "HIDRAULICA UNIÃO", "90012", 1250, "CHARLES SANTOS", "900021", "CONCLUÍDO"],
    ];
    const rows = base.map((item, index) => {
      const received = d(item[0]);
      const launched = item[1] ? d(item[1]) : null;
      const end = item[9] === "FALTA LANÇAMENTO" ? today : launched;
      const days = end ? Math.max(0, Math.round((end - received) / 86400000)) : null;
      return {
        id: `demo-${index}`, rowNumber: index + 3, dataRecebimento: received, dataLancamento: launched,
        prefixo: item[2], equipamento: item[3], fornecedor: item[4], numeroOrc: item[5],
        valorServico: 0, valorPecas: 0, valorTotal: item[6], solicitante: item[7],
        numeroOs: "Não informado", numeroRequisicao: item[8], numeroPedido: "Não informado",
        dataPedido: "", numeroNfs: "Não informado", dataLancamentoNfs: "", status: item[9],
        observacoes: "", diasAguardando: days, leadTimeLancamento: launched ? Math.max(0, Math.round((launched - received) / 86400000)) : null,
      };
    });
    return { rows, sourceName: "Demonstração", loadedAt: new Date(), equipmentLookupCount: 0 };
  }

  function exportRows() {
    return tableRows();
  }

  function safeCsv(value) {
    let raw = String(value ?? "");
    if (/^[=+\-@]/.test(raw)) raw = `'${raw}`;
    return `"${raw.replace(/"/g, '""')}"`;
  }

  function exportCsv() {
    const rows = exportRows();
    const headers = ["DATA DE RECEBIMENTO","DATA LANÇAMENTO","PREFIXO","Equipamento","FORNECEDOR","Nº ORÇ. FINAL","VALOR SERVIÇO","VALOR PEÇAS","VALOR TOTAL","SOLICITANTE","Nº ORDEM SERVIÇO","Nº REQUISIÇÃO","Nº PEDIDO DE COMPRA","DATA DO PEDIDO","Nº NFS/DANFE","DATA LANÇAMENTO(NFS)","STATUS","OBS ADICIONAIS"];
    const values = rows.map(row => [formatDate(row.dataRecebimento), formatDate(row.dataLancamento), row.prefixo, row.equipamento, row.fornecedor, row.numeroOrc, row.valorServico, row.valorPecas, row.valorTotal, row.solicitante, row.numeroOs, row.numeroRequisicao, row.numeroPedido, row.dataPedido, row.numeroNfs, row.dataLancamentoNfs, row.status, row.observacoes]);
    const csv = [headers, ...values].map(row => row.map(safeCsv).join(";")).join("\r\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "consulta_orc.csv"; document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function exportExcel() {
    const rows = exportRows();
    const columns = ["DATA DE RECEBIMENTO","DATA LANÇAMENTO","PREFIXO","EQUIPAMENTO","FORNECEDOR","Nº ORÇ. FINAL","VALOR SERVIÇO","VALOR PEÇAS","VALOR TOTAL","SOLICITANTE","Nº ORDEM SERVIÇO","Nº REQUISIÇÃO","Nº PEDIDO DE COMPRA","DATA DO PEDIDO","Nº NFS/DANFE","DATA LANÇAMENTO(NFS)","STATUS","OBS ADICIONAIS"];
    const objects = rows.map(row => ({
      "DATA DE RECEBIMENTO": formatDate(row.dataRecebimento),
      "DATA LANÇAMENTO": formatDate(row.dataLancamento),
      "PREFIXO": row.prefixo,
      "EQUIPAMENTO": row.equipamento,
      "FORNECEDOR": row.fornecedor,
      "Nº ORÇ. FINAL": row.numeroOrc,
      "VALOR SERVIÇO": row.valorServico,
      "VALOR PEÇAS": row.valorPecas,
      "VALOR TOTAL": row.valorTotal,
      "SOLICITANTE": row.solicitante,
      "Nº ORDEM SERVIÇO": row.numeroOs,
      "Nº REQUISIÇÃO": row.numeroRequisicao,
      "Nº PEDIDO DE COMPRA": row.numeroPedido,
      "DATA DO PEDIDO": row.dataPedido,
      "Nº NFS/DANFE": row.numeroNfs,
      "DATA LANÇAMENTO(NFS)": row.dataLancamentoNfs,
      "STATUS": row.status,
      "OBS ADICIONAIS": row.observacoes,
    }));
    const stages = Object.fromEntries(statusOrder.map(status => {
      const stageRows = rows.filter(row => row.status === status);
      return [status, { count: stageRows.length, value: stageRows.reduce((sum, row) => sum + row.valorTotal, 0) }];
    }));
    const summary = {
      scope: "Consulta filtrada",
      count: rows.length,
      totalValue: rows.reduce((sum, row) => sum + row.valorTotal, 0),
      maxDays: Math.max(...rows.map(row => row.diasAguardando || 0), 0),
      stages,
      topSuppliers: countBy(rows, row => row.fornecedor).slice(0, 5).map(item => ({
        label: item.name, count: item.value, value: rows.filter(row => row.fornecedor === item.name).reduce((sum, row) => sum + row.valorTotal, 0)
      })),
      appliedFilters: Object.values(state.filters).filter(Boolean),
      security: { classification: "interno", role: "PCM" },
      dataVersion: state.dataset?.sourceName || "",
    };
    await window.exportOperationalXlsxV99(objects, columns, summary, "consulta_orc.xlsx");
  }

  async function openSelectedFile() {
    const error = $("#uploadError");
    error.hidden = true;
    if (!state.currentFile) return;
    $("#openBtn").disabled = true;
    $("#openBtn").textContent = "Processando...";
    try {
      const dataset = await window.OrcXlsxReader.read(state.currentFile);
      loadDataset(dataset);
    } catch (reason) {
      error.textContent = reason instanceof Error ? reason.message : "Não foi possível processar a planilha.";
      error.hidden = false;
    } finally {
      $("#openBtn").textContent = "Abrir dashboard";
      $("#openBtn").disabled = !state.currentFile;
    }
  }

  // Upload
  $("#fileInput").addEventListener("change", event => {
    const file = event.target.files?.[0] || null;
    state.currentFile = file;
    $("#fileDrop").classList.toggle("has-file", Boolean(file));
    $("#fileTitle").textContent = file ? "Arquivo selecionado" : "Selecionar planilha .xlsx";
    $("#fileName").textContent = file ? file.name : "CONTROLE_DE_REQUISICOES_2026.xlsx";
    $("#openBtn").disabled = !file;
    $("#uploadError").hidden = true;
  });
  $("#openBtn").addEventListener("click", openSelectedFile);
  $("#demoBtn").addEventListener("click", () => loadDataset(demoDataset()));
  $("#changeBaseBtn").addEventListener("click", () => {
    closeDrawer();
    state.dataset = null; state.rows = []; state.currentFile = null;
    $("#fileInput").value = ""; $("#fileDrop").classList.remove("has-file");
    $("#fileTitle").textContent = "Selecionar planilha .xlsx";
    $("#fileName").textContent = "CONTROLE_DE_REQUISICOES_2026.xlsx";
    $("#openBtn").disabled = true; $("#appShell").hidden = true; $("#uploadScreen").hidden = false;
  });

  // Theme and views
  $("#themeBtn").addEventListener("click", () => {
    document.documentElement.classList.toggle("dark");
    $("#themeBtn").textContent = document.documentElement.classList.contains("dark") ? "☀" : "☾";
  });
  $$(".nav-item").forEach(button => button.addEventListener("click", () => setView(button.dataset.view)));
  window.addEventListener("hashchange", () => state.dataset && setView(location.hash === "#consulta" ? "consulta" : "overview"));

  // Filters
  $("#globalSearch").addEventListener("input", event => applyFilter("search", event.target.value));
  $("#filterStatus").addEventListener("change", event => applyFilter("status", event.target.value));
  $("#filterFornecedor").addEventListener("change", event => applyFilter("fornecedor", event.target.value));
  $("#filterSolicitante").addEventListener("change", event => applyFilter("solicitante", event.target.value));
  $("#filterMes").addEventListener("change", event => applyFilter("mes", event.target.value));
  $("#resetFilters").addEventListener("click", resetFilters);
  $("#kpiPendingBtn").addEventListener("click", () => applyFilter("status", "FALTA LANÇAMENTO"));

  // Consultation
  $("#tableSearch").addEventListener("input", event => { state.tableSearch = event.target.value; state.page = 1; renderTable(); });
  $$("[data-sort]").forEach(button => button.addEventListener("click", () => {
    const key = button.dataset.sort;
    state.sort = { key, direction: state.sort.key === key && state.sort.direction === "asc" ? "desc" : "asc" };
    renderTable();
  }));
  $("#prevPage").addEventListener("click", () => { state.page = Math.max(1, state.page - 1); renderTable(); });
  $("#nextPage").addEventListener("click", () => { state.page += 1; renderTable(); });
  $("#exportCsvBtn").addEventListener("click", exportCsv);
  $("#exportExcelBtn").addEventListener("click", exportExcel);

  // Drawer
  $("#closeDrawer").addEventListener("click", closeDrawer);
  $("#drawerOverlay").addEventListener("mousedown", event => { if (event.target === event.currentTarget) closeDrawer(); });
  $("#drawerPrev").addEventListener("click", () => moveDrawer(-1));
  $("#drawerNext").addEventListener("click", () => moveDrawer(1));
  document.addEventListener("keydown", event => {
    if ($("#drawerOverlay").hidden) return;
    if (event.key === "Escape") closeDrawer();
    if (event.key === "ArrowLeft") moveDrawer(-1);
    if (event.key === "ArrowRight") moveDrawer(1);
  });
})();
