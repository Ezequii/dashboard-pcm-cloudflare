/* ==========================================================================
   V107 — produtividade operacional simplificada
   Colunas configuráveis, detalhes de linha e exportação XLSX.
   ========================================================================== */
(() => {
  "use strict";

  const COLUMNS_KEY_V99 = "pcm-dashboard-columns-v100-base-redesign";
  const MAX_MULTI_TERMS_V99 = 500;

  let columnPreferencesV99 = readColumnPreferencesV99();
  let columnDraftV99 = null;
  let detailRowsV99 = [];
  let detailIndexV99 = -1;
  let activeDetailRowV99 = null;
  let lastDetailQueryKeyV99 = "";
  let productivityInitializedV99 = false;

  function normalizeTextV99(value){
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function normalizeCodeV99(value){
    return normalizeTextV99(value)
      .toUpperCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function parseMultiSearchInputV99(raw, scope="ALL"){
    const text = String(raw ?? "").replace(/\r/g, "\n").trim();
    if(!text) return [];

    let values = text
      .split(/[\n,;|]+/)
      .map(value => value.trim())
      .filter(Boolean);

    if(values.length === 1){
      const tokens = values[0].split(/\s+/).filter(Boolean);
      const codeScope = ["REQUISICAO", "PEDIDO", "DOCUMENTO"].includes(
        String(scope || "ALL").toUpperCase()
      );
      const allCodeLike = tokens.length > 1 && tokens.every(token =>
        /^[A-Z0-9./_-]{3,}$/i.test(token)
      );
      if(codeScope || allCodeLike){
        values = tokens;
      }
    }

    const unique = [];
    values.forEach(value => {
      const clean = value.replace(/\s+/g, " ").trim().slice(0, 160);
      const key = normalizeCodeV99(clean);
      if(clean && !unique.some(item => normalizeCodeV99(item) === key)){
        unique.push(clean);
      }
    });
    return unique.slice(0, MAX_MULTI_TERMS_V99);
  }



  function normalizeMultiSearchTermsV100(values){
    const source = Array.isArray(values) ? values : [];
    const unique = [];
    const seen = new Set();

    source.forEach(value => {
      const clean = String(value ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 160);
      const key = normalizeCodeV99(clean);
      if(!clean || seen.has(key)) return;
      seen.add(key);
      unique.push(clean);
    });

    return unique.slice(0, MAX_MULTI_TERMS_V99);
  }

  function safeFiltersV99(filters){
    const result = {};
    Object.entries(filters || {}).forEach(([key, values]) => {
      if(!Array.isArray(values)) return;
      const clean = values
        .map(value => String(value ?? "").trim())
        .filter(Boolean)
        .slice(0, 100);
      if(clean.length) result[key] = clean;
    });
    return result;
  }

  function captureViewStateV99(){
    return {
      version: 1,
      activeTab: state.activeTab === "base" ? "base" : "visao",
      filters: safeFiltersV99(state.filters),
      search: String(state.search || "").slice(0, 200),
      searchScope: String(state.searchScope || "ALL"),
      multiSearchTerms: [],
      multiSearchMode: state.multiSearchMode === "ALL" ? "ALL" : "ANY",
      dateFrom: String(state.dateFrom || ""),
      dateTo: String(state.dateTo || ""),
      valueMin: String(state.valueMin || ""),
      valueMax: String(state.valueMax || ""),
      sortCol: String(state.sortCol || "ETAPA"),
      sortDir: state.sortDir === "asc" ? "asc" : "desc",
      pageSize: Math.max(10, Math.min(Number(state.pageSize || 200), 300)),
      columns: {
        order: Array.isArray(columnPreferencesV99.order)
          ? columnPreferencesV99.order.slice()
          : [],
        hidden: Array.isArray(columnPreferencesV99.hidden)
          ? columnPreferencesV99.hidden.slice()
          : [],
      },
    };
  }

  function validateViewStateV99(view){
    if(!view || typeof view !== "object") return null;
    return {
      version: 1,
      activeTab: view.activeTab === "base" ? "base" : "visao",
      filters: safeFiltersV99(view.filters),
      search: String(view.search || "").slice(0, 200),
      searchScope: String(view.searchScope || "ALL").slice(0, 40),
      multiSearchTerms: [],
      multiSearchMode: view.multiSearchMode === "ALL" ? "ALL" : "ANY",
      dateFrom: /^\d{4}-\d{2}-\d{2}$/.test(String(view.dateFrom || ""))
        ? String(view.dateFrom)
        : "",
      dateTo: /^\d{4}-\d{2}-\d{2}$/.test(String(view.dateTo || ""))
        ? String(view.dateTo)
        : "",
      valueMin: String(view.valueMin || "").slice(0, 30),
      valueMax: String(view.valueMax || "").slice(0, 30),
      sortCol: String(view.sortCol || "ETAPA").slice(0, 100),
      sortDir: view.sortDir === "asc" ? "asc" : "desc",
      pageSize: [50, 100, 200, 300].includes(Number(view.pageSize))
        ? Number(view.pageSize)
        : 200,
      columns: {
        order: Array.isArray(view.columns?.order)
          ? view.columns.order.map(String).slice(0, 100)
          : [],
        hidden: Array.isArray(view.columns?.hidden)
          ? view.columns.hidden.map(String).slice(0, 100)
          : [],
      },
    };
  }

  function applyViewStateV99(view, options={}){
    const safe = validateViewStateV99(view);
    if(!safe) return false;

    state.filters = safe.filters;
    (state.mainFilters || []).forEach(definition => {
      if(!Array.isArray(state.filters[definition.key])) state.filters[definition.key] = [];
    });
    ["DONO DA AÇÃO","SLA STATUS","FAIXA ATRASO"].forEach(key => {
      if(!Array.isArray(state.filters[key])) state.filters[key] = [];
    });
    state.search = safe.search;
    state.searchScope = safe.searchScope;
    state.multiSearchTerms = [];
    state.multiSearchMode = "ANY";
    state.dateFrom = safe.dateFrom;
    state.dateTo = safe.dateTo;
    state.valueMin = safe.valueMin;
    state.valueMax = safe.valueMax;
    state.sortCol = safe.sortCol;
    state.sortDir = safe.sortDir;
    state.pageSize = safe.pageSize;
    state.page = 1;
    state.activeTab = safe.activeTab;

    columnPreferencesV99 = {
      order: safe.columns.order,
      hidden: safe.columns.hidden,
    };
    writeColumnPreferencesV99(columnPreferencesV99);

    if(options.hydrate !== false){
      hydrateProductivityUiV99();
      updateFilterUI?.();
      hydrateAdvancedSearch?.();
      if(typeof switchTab === "function"){
        switchTab(state.activeTab, {loadRowsNow:false});
      }
    }

    if(options.refresh){
      savePreferences();
      refreshAll(false).catch(error => {
        console.error("Falha ao aplicar visão V99:", error);
        showToast("Não foi possível aplicar a visão salva.", true);
      });
    }
    return true;
  }

  function restoreProductivityStateV99(){
    // Compartilhamento de visão removido na V107.
    return false;
  }

  function syncProductivityUrlV99(){
    return window.location.href;
  }

  async function copyTextV99(text, successMessage){
    const value = String(text || "");
    if(!value) return false;

    try{
      if(navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(value);
      }else{
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.className = "clipboard-fallback-v994a";
        document.body.appendChild(textarea);
        textarea.select();
        if(!document.execCommand("copy")){
          throw new Error("O navegador bloqueou a cópia.");
        }
        textarea.remove();
      }
      showToast(successMessage || "Conteúdo copiado.");
      return true;
    }catch(error){
      showToast(error.message || "Não foi possível copiar.", true);
      return false;
    }
  }

  function readColumnPreferencesV99(){
    try{
      const value = JSON.parse(localStorage.getItem(COLUMNS_KEY_V99) || "{}");
      return {
        order: Array.isArray(value.order) ? value.order.map(String) : [],
        hidden: Array.isArray(value.hidden) ? value.hidden.map(String) : [],
      };
    }catch(error){
      return {order:[], hidden:[]};
    }
  }

  function writeColumnPreferencesV99(preferences){
    try{
      localStorage.setItem(
        COLUMNS_KEY_V99,
        JSON.stringify({
          order: Array.isArray(preferences.order) ? preferences.order : [],
          hidden: Array.isArray(preferences.hidden) ? preferences.hidden : [],
        })
      );
    }catch(error){
      console.warn("Não foi possível salvar as colunas:", error);
    }
  }

  function resolveColumnsV99(defaultColumns, sourceColumns){
    const available = new Set((sourceColumns || defaultColumns || []).map(String));
    const defaultList = (defaultColumns || []).filter(column => available.has(column));
    const hasCustomPreferences = Boolean(
      (columnPreferencesV99.order || []).length ||
      (columnPreferencesV99.hidden || []).length
    );

    if(!hasCustomPreferences){
      return defaultList.slice();
    }

    const ordered = [
      ...(columnPreferencesV99.order || []).filter(column => available.has(column)),
      ...defaultList.filter(column => !(columnPreferencesV99.order || []).includes(column)),
      ...Array.from(available).filter(column =>
        !defaultList.includes(column) &&
        !(columnPreferencesV99.order || []).includes(column)
      ),
    ];

    const hidden = new Set(columnPreferencesV99.hidden || []);
    const visible = ordered.filter(column => !hidden.has(column));
    return visible.length ? visible : defaultList.slice(0, Math.max(1, defaultList.length));
  }

  function openDialogV99(dialog){
    if(!dialog) return;
    if(typeof dialog.showModal === "function"){
      if(!dialog.open) dialog.showModal();
    }else{
      dialog.setAttribute("open", "");
    }
  }

  function closeDialogV99(dialog){
    if(!dialog) return;
    if(typeof dialog.close === "function" && dialog.open){
      dialog.close();
    }else{
      dialog.removeAttribute("open");
    }
  }

  function hydrateProductivityUiV99(){
    const globalSearch = document.getElementById("globalSearch");
    const scope = document.getElementById("searchScope");
    const pageSize = document.getElementById("pageSize");
    if(globalSearch) globalSearch.value = state.search || "";
    if(scope) scope.value = state.searchScope || "ALL";
    if(pageSize) pageSize.value = String(state.pageSize || 200);
    updateProductivityStateV99();
  }



  function columnLabelV99(column){
    if(typeof headerInfo === "function"){
      const [main, sub] = headerInfo(column);
      return sub ? `${main} — ${sub}` : main;
    }
    return column;
  }

  function openColumnsV99(){
    const available = Array.isArray(state.columns) ? state.columns.slice() : [];
    const defaults = (window.V100_DEFAULT_BASE_COLUMNS || [])
      .filter(column => available.includes(column));
    const hasCustomPreferences = Boolean(
      (columnPreferencesV99.order || []).length ||
      (columnPreferencesV99.hidden || []).length
    );
    const order = hasCustomPreferences
      ? [
          ...(columnPreferencesV99.order || []).filter(column => available.includes(column)),
          ...available.filter(column => !(columnPreferencesV99.order || []).includes(column)),
        ]
      : [
          ...defaults,
          ...available.filter(column => !defaults.includes(column)),
        ];
    columnDraftV99 = {
      order,
      hidden: new Set(
        hasCustomPreferences
          ? (columnPreferencesV99.hidden || [])
          : available.filter(column => !defaults.includes(column))
      ),
    };
    renderColumnsV99();
    openDialogV99(document.getElementById("columnsDialogV99"));
  }

  function renderColumnsV99(){
    const host = document.getElementById("columnsListV99");
    if(!host || !columnDraftV99) return;

    host.innerHTML = columnDraftV99.order.map((column, index) => {
      const visible = !columnDraftV99.hidden.has(column);
      return `
        <div class="column-option-v99" data-column="${escapeAttr(column)}">
          <label>
            <input type="checkbox" ${visible ? "checked" : ""}>
            <span>${escapeHtml(columnLabelV99(column))}</span>
          </label>
          <div>
            <button type="button" data-action="up" ${index === 0 ? "disabled" : ""} aria-label="Mover para cima">↑</button>
            <button type="button" data-action="down" ${index === columnDraftV99.order.length - 1 ? "disabled" : ""} aria-label="Mover para baixo">↓</button>
          </div>
        </div>`;
    }).join("");

    host.querySelectorAll(".column-option-v99").forEach(row => {
      const column = row.dataset.column;
      const checkbox = row.querySelector('input[type="checkbox"]');
      checkbox.onchange = () => {
        if(checkbox.checked) columnDraftV99.hidden.delete(column);
        else columnDraftV99.hidden.add(column);
      };

      row.querySelector('[data-action="up"]').onclick = () => {
        const index = columnDraftV99.order.indexOf(column);
        if(index <= 0) return;
        [columnDraftV99.order[index - 1], columnDraftV99.order[index]] =
          [columnDraftV99.order[index], columnDraftV99.order[index - 1]];
        renderColumnsV99();
      };

      row.querySelector('[data-action="down"]').onclick = () => {
        const index = columnDraftV99.order.indexOf(column);
        if(index < 0 || index >= columnDraftV99.order.length - 1) return;
        [columnDraftV99.order[index + 1], columnDraftV99.order[index]] =
          [columnDraftV99.order[index], columnDraftV99.order[index + 1]];
        renderColumnsV99();
      };
    });
  }

  function applyColumnsV99(){
    if(!columnDraftV99) return;
    const visibleCount = columnDraftV99.order.length - columnDraftV99.hidden.size;
    if(visibleCount < 1){
      showToast("Mantenha ao menos uma coluna visível.", true);
      return;
    }
    columnPreferencesV99 = {
      order: columnDraftV99.order.slice(),
      hidden: Array.from(columnDraftV99.hidden),
    };
    writeColumnPreferencesV99(columnPreferencesV99);
    savePreferences();
    closeDialogV99(document.getElementById("columnsDialogV99"));
    loadRowsSafely();
    showToast("Colunas atualizadas.");
  }

  function resetColumnsV99(){
    columnPreferencesV99 = {order:[], hidden:[]};
    writeColumnPreferencesV99(columnPreferencesV99);
    const available = Array.isArray(state.columns) ? state.columns.slice() : [];
    const defaults = (window.V100_DEFAULT_BASE_COLUMNS || [])
      .filter(column => available.includes(column));
    columnDraftV99 = {
      order: [
        ...defaults,
        ...available.filter(column => !defaults.includes(column)),
      ],
      hidden: new Set(available.filter(column => !defaults.includes(column))),
    };
    renderColumnsV99();
  }

  function rowIdV99(row){
    return String(row?._ROW_ID ?? "");
  }


  function clearProductivityQueryContextV100(){
    state.multiSearchTerms = [];
    state.multiSearchMode = "ANY";
    updateProductivityStateV99();
  }

  function updateProductivityStateV99(){
    const host = document.getElementById("productivityStateV99");
    if(!host) return;
    const hidden = (columnPreferencesV99.hidden || []).length;
    host.textContent = hidden
      ? `${hidden} coluna${hidden === 1 ? "" : "s"} oculta${hidden === 1 ? "" : "s"}`
      : "Colunas padrão visíveis";
  }

  function afterTableRenderV99(data, columns, tbody){
    tbody.querySelectorAll("tr[data-row-id]").forEach(rowElement => {
      rowElement.onclick = event => {
        if(event.target.closest("input,button,a,select,textarea,label")) return;
        openDetailsV99(rowElement.dataset.rowId);
      };
      rowElement.onkeydown = event => {
        if(event.key !== "Enter" && event.key !== " ") return;
        if(event.target.closest("input,button,a,select,textarea")) return;
        event.preventDefault();
        openDetailsV99(rowElement.dataset.rowId);
      };
    });

    updateProductivityStateV99();
  }


  function parseMoneyV99(row){
    const direct = Number(row?._VALOR_TOTAL);
    if(Number.isFinite(direct)) return direct;
    const raw = String(row?.["VALOR TOTAL"] ?? "")
      .replace(/R\$/gi, "")
      .replace(/\s/g, "")
      .replace(/[^0-9,.-]/g, "");
    const normalized = raw.includes(",")
      ? raw.replace(/\./g, "").replace(",", ".")
      : raw;
    const number = Number(normalized);
    return Number.isFinite(number) ? number : 0;
  }

  function rowDaysV99(row){
    const value = Number(row?._DIAS_PARADO ?? row?.["DIAS PARADO"]);
    return Number.isFinite(value) ? value : 0;
  }

  function buildOperationalSummaryV99(rows, scope="Visão atual"){
    const items = Array.isArray(rows) ? rows : [];
    const stages = {};
    const suppliers = new Map();
    let totalValue = 0;
    let maxDays = 0;

    items.forEach(row => {
      const stage = String(row.ETAPA || row._ETAPA || "NÃO INFORMADO");
      const value = parseMoneyV99(row);
      const supplier = String(row.FORNECEDOR || "NÃO INFORMADO");
      totalValue += value;
      maxDays = Math.max(maxDays, rowDaysV99(row));

      if(!stages[stage]) stages[stage] = {count:0, value:0};
      stages[stage].count += 1;
      stages[stage].value += value;

      if(!suppliers.has(supplier)){
        suppliers.set(supplier, {label:supplier, count:0, value:0});
      }
      const supplierItem = suppliers.get(supplier);
      supplierItem.count += 1;
      supplierItem.value += value;
    });

    const topSuppliers = Array.from(suppliers.values())
      .sort((a, b) => b.value - a.value || b.count - a.count)
      .slice(0, 5);

    const money = value => Number(value || 0).toLocaleString(
      "pt-BR",
      {style:"currency", currency:"BRL"}
    );

    const lines = [
      `Resumo PCM — ${scope}`,
      `${items.length.toLocaleString("pt-BR")} registro${items.length === 1 ? "" : "s"} · ${money(totalValue)}`,
      `Maior tempo parado: ${maxDays.toLocaleString("pt-BR")} dia${maxDays === 1 ? "" : "s"}`,
      "",
      "Etapas:",
      ...Object.entries(stages)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([stage, item]) =>
          `• ${stage}: ${item.count.toLocaleString("pt-BR")} · ${money(item.value)}`
        ),
      "",
      "Principais fornecedores:",
      ...topSuppliers.map((item, index) =>
        `${index + 1}. ${item.label}: ${item.count.toLocaleString("pt-BR")} · ${money(item.value)}`
      ),
    ];

    const securityContext = window.SecurityV994a?.getContext?.() || {};
    const appliedFilters = Object.entries(state.filters || {})
      .filter(([, values]) => Array.isArray(values) && values.length)
      .map(([key, values]) => `${key}: ${values.join(", ")}`);

    return {
      scope,
      count: items.length,
      totalValue,
      maxDays,
      stages,
      topSuppliers,
      text: lines.join("\n"),
      dataVersion: state.dataVersion || "",
      appliedFilters,
      security: {
        classification: securityContext.classification || "interno",
        role: securityContext.role || "não verificado"
      }
    };
  }

  async function rowsForCurrentActionV99(){
    const data = await api("/api/rows", {
      ...tableQuery(),
      page: 1,
      page_size: 100000,
    });
    return {
      rows: data.rows || [],
      scope: "Visão filtrada",
      columns: data.columns || [],
    };
  }


  function exportFilenameV99(scope){
    const slug = String(scope || "visao")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 45);
    return `pcm_${slug || "operacional"}_${new Date().toISOString().slice(0,10)}.xlsx`;
  }

  async function exportExcelFromCurrentViewV99(){
    try{
      if(!window.SecurityV994a?.canExport()){
        throw new Error('Seu perfil não permite exportar dados.');
      }
      setLoading(true);
      const result = await rowsForCurrentActionV99();
      if(!result.rows.length){
        throw new Error("Não há registros para exportar.");
      }

      const sourceColumns = result.columns?.length
        ? result.columns
        : (state.columns || []);
      const columns = resolveColumnsV99(sourceColumns, sourceColumns);
      const summary = buildOperationalSummaryV99(result.rows, result.scope);
      const info = await exportOperationalXlsxV99(
        result.rows,
        columns,
        summary,
        exportFilenameV99(result.scope)
      );
      showToast(
        `Excel gerado: ${info.rows.toLocaleString("pt-BR")} registros em ${info.filename}.`
      );
    }catch(error){
      console.error("Falha na exportação Excel:", error);
      showToast(error.message || "Não foi possível gerar o Excel.", true);
    }finally{
      setLoading(false);
    }
  }

  async function prepareDetailNavigationV99(){
    const query = {
      ...tableQuery(),
      page: 1,
      page_size: 100000,
    };
    const key = JSON.stringify(query);
    if(key === lastDetailQueryKeyV99 && detailRowsV99.length) return;
    const data = await api("/api/rows", query);
    detailRowsV99 = data.rows || [];
    lastDetailQueryKeyV99 = key;
  }

  function orderedDetailFieldsV99(row){
    const preferred = [
      "ETAPA",
      "Nº REQUISIÇÃO",
      "Nº PEDIDO DE COMPRA",
      "Nº ORÇAMENTO FINAL",
      "FORNECEDOR",
      "SOLICITANTE",
      "EQUIPAMENTO",
      "PREFIXO",
      "DIAS PARADO",
      "SLA STATUS",
      "DONO DA AÇÃO",
      "DATA DE RECEBIMENTO",
      "DATA LANÇAMENTO",
      "VALOR TOTAL",
      "VALOR PEÇAS",
      "VALOR SERVIÇO",
    ];
    const keys = Object.keys(row || {}).filter(key => !key.startsWith("_"));
    return [
      ...preferred.filter(key => keys.includes(key)),
      ...keys.filter(key => !preferred.includes(key)).sort(
        (a, b) => a.localeCompare(b, "pt-BR", {sensitivity:"base"})
      ),
    ];
  }

  const PRIORITY_DETAIL_FIELDS_V119 = new Set([
    "DATA DE RECEBIMENTO",
    "Nº REQUISIÇÃO",
    "Nº PEDIDO DE COMPRA",
    "Nº PEDIDO",
    "SOLICITANTE",
    "PREFIXO",
  ]);

  function isPriorityDetailFieldV119(field){
    return PRIORITY_DETAIL_FIELDS_V119.has(
      String(field || "").trim().toUpperCase()
    );
  }

  function splitDetailValuesV994a2(value, includeSlash=false){
    const expression = includeSlash ? /[|;,/]+/ : /[|;,\n]+/;
    return String(value ?? "")
      .split(expression)
      .map(item => item.trim())
      .filter(Boolean);
  }

  function detailDisplayV994a2(field, value, row){
    const empty = value === null
      || value === undefined
      || String(value).trim() === "";

    if(empty){
      return {
        html:"Não informado",
        plain:"Não informado",
        className:"is-empty"
      };
    }

    const normalizedField = String(field || "").trim().toUpperCase();
    const moneyFields = new Set([
      "VALOR TOTAL",
      "VALOR PEÇAS",
      "VALOR SERVIÇO",
      "VALOR UNITÁRIO"
    ]);

    if(moneyFields.has(normalizedField)){
      const source = normalizedField === "VALOR TOTAL"
        ? (row?._VALOR_TOTAL ?? value)
        : normalizedField === "VALOR PEÇAS"
          ? (row?._VALOR_PECAS ?? value)
          : normalizedField === "VALOR SERVIÇO"
            ? (row?._VALOR_SERVICO ?? value)
            : value;
      const formatted = formatCurrencyBR(source);
      return {
        html:escapeHtml(formatted),
        plain:formatted,
        className:"is-money-v994a2"
      };
    }

    if(normalizedField === "DIAS PARADO"){
      const days = Math.max(0, Number(row?._DIAS_PARADO ?? value) || 0);
      const formatted = `${days.toLocaleString("pt-BR")} dia${days === 1 ? "" : "s"}`;
      return {
        html:escapeHtml(formatted),
        plain:formatted,
        className:days >= 30 ? "is-critical-v994a2" : ""
      };
    }

    const isDateField = normalizedField.includes("DATA");
    const isDocumentField = normalizedField.startsWith("Nº")
      || normalizedField.includes("DANFE")
      || normalizedField.includes("ORDEM SERVIÇO");

    const parts = splitDetailValuesV994a2(value, isDocumentField && !isDateField);
    if(parts.length > 1){
      const className = isDateField
        ? "is-list-v994a2 is-date-list-v994a2"
        : "is-list-v994a2";
      return {
        html:parts.map(part =>
          `<span class="detail-token-v994a2">${escapeHtml(part)}</span>`
        ).join(""),
        plain:parts.join(" · "),
        className
      };
    }

    const plain = String(value).trim();
    return {
      html:escapeHtml(plain),
      plain,
      className:""
    };
  }

  function renderDetailV99(row){
    activeDetailRowV99 = row;
    const title = document.getElementById("detailsTitleV99");
    const subtitle = document.getElementById("detailsSubtitleV99");
    const content = document.getElementById("detailsContentV99");
    const previous = document.getElementById("btnPreviousDetailV99");
    const next = document.getElementById("btnNextDetailV99");
    const reference = documentReferenceV994a5(row);
    const copyCodeButton = document.getElementById("btnCopyRowV99");

    if(title) title.textContent = reference.title;
    if(copyCodeButton){
      copyCodeButton.textContent = `Copiar ${reference.kind}`;
      copyCodeButton.setAttribute(
        "aria-label",
        `Copiar identificação ${reference.text}`
      );
    }
    if(subtitle){
      subtitle.textContent = [
        reference.subtitle,
        row?.ETAPA || row?._ETAPA,
        row?.FORNECEDOR,
      ].filter(Boolean).join(" · ");
    }

    if(content){
      content.innerHTML = orderedDetailFieldsV99(row).map(field => {
        const display = detailDisplayV994a2(field, row[field], row);
        const priorityAttribute = isPriorityDetailFieldV119(field)
          ? ' data-detail-priority="true"'
          : "";
        return `
          <div class="detail-field-v99 detail-field-v994a2"${priorityAttribute}>
            <span>${escapeHtml(field)}</span>
            <strong
              class="${display.className}"
              title="${escapeAttr(display.plain)}">
              ${display.html}
            </strong>
          </div>`;
      }).join("");
    }

    if(previous) previous.disabled = detailIndexV99 <= 0;
    if(next){
      next.disabled = detailIndexV99 < 0
        || detailIndexV99 >= detailRowsV99.length - 1;
    }
  }

  async function openDetailsV99(rowId){
    try{
      window.SecurityV994a?.assertOperationalAccess();
      setLoading(true);
      await prepareDetailNavigationV99();
      detailIndexV99 = detailRowsV99.findIndex(
        row => rowIdV99(row) === String(rowId)
      );
      if(detailIndexV99 < 0){
        detailIndexV99 = 0;
      }

      const navigationRow = detailRowsV99[detailIndexV99];
      const response = await api("/api/row", {
        row_id: navigationRow?._ROW_ID || rowId,
      });
      if(!response.row){
        throw new Error("O registro não foi encontrado.");
      }

      renderDetailV99(response.row);
      const drawer = document.getElementById("detailsDrawerV99");
      const backdrop = document.getElementById("detailsBackdropV99");
      if(drawer){
        drawer.classList.add("is-open");
        drawer.setAttribute("aria-hidden", "false");
      }
      if(backdrop) backdrop.hidden = false;
      document.body.classList.add("details-open-v99");
      document.getElementById("btnCloseDetailsV99")?.focus();
    }catch(error){
      showToast(error.message || "Não foi possível abrir os detalhes.", true);
    }finally{
      setLoading(false);
    }
  }

  function closeDetailsV99(){
    const drawer = document.getElementById("detailsDrawerV99");
    const backdrop = document.getElementById("detailsBackdropV99");
    if(drawer){
      drawer.classList.remove("is-open");
      drawer.setAttribute("aria-hidden", "true");
    }
    if(backdrop) backdrop.hidden = true;
    document.body.classList.remove("details-open-v99");
  }

  async function navigateDetailV99(direction){
    const nextIndex = detailIndexV99 + direction;
    if(nextIndex < 0 || nextIndex >= detailRowsV99.length) return;
    detailIndexV99 = nextIndex;
    const row = detailRowsV99[detailIndexV99];
    const response = await api("/api/row", {row_id:row._ROW_ID});
    if(response.row) renderDetailV99(response.row);
  }

  function documentReferenceV994a5(row){
    const orc = String(
      row?.["Nº ORÇAMENTO FINAL"] || ""
    ).trim();
    const serviceOrder = String(
      row?.["Nº ORDEM SERVIÇO"] || ""
    ).trim();
    const requisition = String(
      row?.["Nº REQUISIÇÃO"] || ""
    ).trim();

    const parts = [
      orc ? `ORC ${orc}` : "",
      serviceOrder ? `OS ${serviceOrder}` : ""
    ].filter(Boolean);

    if(parts.length){
      return {
        title:parts[0],
        text:parts.join(" · "),
        subtitle:parts.slice(1).join(" · "),
        kind:orc && serviceOrder
          ? "ORC/OS"
          : orc
            ? "ORC"
            : "OS"
      };
    }

    return {
      title:requisition
        ? `Requisição ${requisition}`
        : "Registro operacional",
      text:requisition || String(row?._ROW_ID || ""),
      subtitle:"",
      kind:requisition ? "requisição" : "registro"
    };
  }

  function currentRowCodeV99(){
    return documentReferenceV994a5(
      activeDetailRowV99
    ).text;
  }


  function bindProductivityEventsV99(){
    document.getElementById("btnColumnsV99")?.addEventListener(
      "click",
      openColumnsV99
    );
    document.getElementById("btnApplyColumnsV99")?.addEventListener(
      "click",
      applyColumnsV99
    );
    document.getElementById("btnResetColumnsV99")?.addEventListener(
      "click",
      resetColumnsV99
    );

    document.getElementById("btnExportExcelTableV99")?.addEventListener(
      "click",
      exportExcelFromCurrentViewV99
    );
    document.getElementById("btnCloseDetailsV99")?.addEventListener(
      "click",
      closeDetailsV99
    );
    document.getElementById("detailsBackdropV99")?.addEventListener(
      "click",
      closeDetailsV99
    );
    document.getElementById("btnPreviousDetailV99")?.addEventListener(
      "click",
      () => navigateDetailV99(-1)
    );
    document.getElementById("btnNextDetailV99")?.addEventListener(
      "click",
      () => navigateDetailV99(1)
    );
    document.getElementById("btnCopyRowV99")?.addEventListener(
      "click",
      () => copyTextV99(currentRowCodeV99(), "Código da ORC/OS copiado.")
    );
    document.getElementById("btnCopyRowSummaryV99")?.addEventListener(
      "click",
      () => {
        if(!activeDetailRowV99) return;
        const summary = buildOperationalSummaryV99(
          [activeDetailRowV99],
          currentRowCodeV99()
        );
        copyTextV99(summary.text, "Resumo da ORC/OS copiado.");
      }
    );

    document.addEventListener("keydown", event => {
      if(event.key === "Escape"){
        closeDetailsV99();
        closeDialogV99(document.getElementById("columnsDialogV99"));
      }
    });

    window.addEventListener("popstate", () => {
      if(restoreProductivityStateV99()){
        hydrateProductivityUiV99();
        updateFilterUI?.();
        hydrateAdvancedSearch?.();
        switchTab(state.activeTab, {loadRowsNow:false});
        refreshAll(false);
      }
    });
  }

  function resetProductivityStateV99(){
    state.multiSearchTerms = [];
    state.multiSearchMode = "ANY";
    lastDetailQueryKeyV99 = "";
    detailRowsV99 = [];
    updateProductivityStateV99();
  }

  function initProductivityV99(){
    if(productivityInitializedV99) return;
    productivityInitializedV99 = true;
    state.multiSearchTerms = [];
    state.multiSearchMode = "ANY";
    bindProductivityEventsV99();
    hydrateProductivityUiV99();
    updateProductivityStateV99();
  }

  window.parseMultiSearchInputV99 = parseMultiSearchInputV99;
  window.normalizeMultiSearchTermsV100 = normalizeMultiSearchTermsV100;
  window.captureViewStateV99 = captureViewStateV99;
  window.applyViewStateV99 = applyViewStateV99;
  window.restoreProductivityStateV99 = restoreProductivityStateV99;
  window.syncProductivityUrlV99 = syncProductivityUrlV99;
  window.resolveColumnsV99 = resolveColumnsV99;
  window.afterTableRenderV99 = afterTableRenderV99;
  window.buildOperationalSummaryV99 = buildOperationalSummaryV99;
  window.clearProductivityQueryContextV100 = clearProductivityQueryContextV100;
  window.exportExcelFromCurrentViewV99 = exportExcelFromCurrentViewV99;
  window.openDetailsV99 = openDetailsV99;
  window.resetProductivityStateV99 = resetProductivityStateV99;
  window.initProductivityV99 = initProductivityV99;
})();
