
(() => {
  "use strict";
  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>[...r.querySelectorAll(s)];

  const waitForApp = (fn, tries=0) => {
    if(typeof window.switchTab === "function" && q("#baseTableRegion")){
      fn();
      return;
    }
    if(tries < 80) setTimeout(()=>waitForApp(fn, tries+1), 100);
  };

  function dispatchInput(el, value){
    if(!el) return;
    el.value = value;
    el.dispatchEvent(new Event("input",{bubbles:true}));
  }

  function syncTrackSearch(value){
    const real = q("#globalSearch");
    if(real) dispatchInput(real, value);
  }

  function activateLegacyFor(view){
    if(typeof window.switchTab !== "function") return;
    if(view === "tracking"){
      window.switchTab("base");
    }else if(view === "overview"){
      window.switchTab("visao",{loadRowsNow:false});
    }
  }

  function patchShellNavigation(){
    qa("[data-ws-view]").forEach(btn=>{
      if(btn.dataset.v201Bound==="1") return;
      btn.dataset.v201Bound="1";
      btn.addEventListener("click",()=>activateLegacyFor(btn.dataset.wsView));
    });
    qa("[data-jump]").forEach(btn=>{
      if(btn.dataset.v201Bound==="1") return;
      btn.dataset.v201Bound="1";
      btn.addEventListener("click",()=>activateLegacyFor(btn.dataset.jump));
    });
  }

  function upgradeTrackingHeader(){
    const panel=q('[data-ws-panel="tracking"]');
    const command=q(".ws-command",panel);
    if(!panel || !command || q(".ws-track-summary",panel)) return;

    const quick=q(".ws-quick",command);
    if(quick){
      const chips=qa(".ws-chip",quick);
      if(chips[0]) chips[0].dataset.view="all";
      if(chips[1]) chips[1].dataset.view="open";
      if(chips[2]) chips[2].dataset.view="attention";
      if(chips[3]) chips[3].dataset.view="done";
    }

    const summary=document.createElement("div");
    summary.className="ws-track-summary";
    summary.innerHTML=`
      <div class="ws-track-summary-left">
        <strong class="ws-track-count" id="wsTrackCount">Carregando registros…</strong>
        <span class="ws-track-context" id="wsTrackContext"></span>
      </div>
      <div class="ws-track-actions">
        <button class="ws-subtle-btn" id="wsColumns">Colunas</button>
        <button class="ws-subtle-btn" id="wsClear">Limpar filtros</button>
        <button class="ws-subtle-btn is-primary" id="wsExport">Exportar</button>
      </div>`;
    command.after(summary);

    q("#wsColumns")?.addEventListener("click",()=>q("#btnColumnsV99")?.click());
    q("#wsExport")?.addEventListener("click",()=>q("#btnExportExcelTableV99")?.click());
    q("#wsClear")?.addEventListener("click",()=>q("#globalContextClearAll")?.click());

    const trackSearch=q("#wsTrackSearch");
    if(trackSearch){
      trackSearch.addEventListener("input",e=>syncTrackSearch(e.target.value));
    }
  }

  function bindViewChips(){
    qa(".ws-chip").forEach(chip=>{
      if(chip.dataset.v201Bound==="1") return;
      chip.dataset.v201Bound="1";
      chip.addEventListener("click",()=>{
        qa(".ws-chip").forEach(x=>x.classList.toggle("is-active",x===chip));
        const view=chip.dataset.view;
        if(view==="all"){
          q("#globalContextClearAll")?.click();
          return;
        }

        // Reaproveita os quick filters já validados quando existirem.
        // Caso a versão da base não exponha o filtro, apenas mantém a visão selecionada.
        const candidates={
          open:["EM ANDAMENTO","ANDAMENTO","PENDENTE"],
          attention:["ATENÇÃO","CRÍTICO","ATRASADO"],
          done:["CONCLUÍDO","CONCLUIDO"]
        }[view] || [];

        const buttons=qa("button");
        const match=buttons.find(b=>{
          const text=(b.textContent||"").trim().toUpperCase();
          return candidates.some(c=>text===c || text.includes(c));
        });
        match?.click();
      });
    });
  }

  function updateTrackingMeta(){
    const total=Number(window.__V99_CURRENT_TOTAL || 0);
    const count=q("#wsTrackCount");
    if(count) count.textContent=total
      ? `${total.toLocaleString("pt-BR")} registro${total===1?"":"s"}`
      : "Nenhum registro no contexto atual";

    const context=q("#wsTrackContext");
    const counter=(q("#tableCounter")?.textContent||"").trim();
    if(context) context.textContent=counter && !counter.startsWith("0 ")
      ? `· ${counter}`
      : "";

    const search=q("#wsTrackSearch");
    const real=q("#globalSearch");
    if(search && real && document.activeElement!==search && search.value!==real.value){
      search.value=real.value||"";
    }
  }

  function enhanceDrawerStructure(){
    const content=q("#detailsContentV99");
    if(!content || content.dataset.v201Enhanced==="1") return;
    content.dataset.v201Enhanced="1";

    // Mantém os campos prioritários primeiro sem mudar dados.
    const priority=qa('[data-detail-priority="true"]',content);
    const rest=qa(".detail-field-v99",content).filter(x=>x.dataset.detailPriority!=="true");

    priority.forEach(el=>content.appendChild(el));
    if(rest.length){
      const section=document.createElement("div");
      section.className="ws-detail-section";
      section.textContent="Mais informações";
      content.appendChild(section);
      rest.forEach(el=>content.appendChild(el));
    }
  }

  function observeDrawer(){
    const content=q("#detailsContentV99");
    if(!content) return;
    const obs=new MutationObserver(()=>{
      content.dataset.v201Enhanced="";
      enhanceDrawerStructure();
    });
    obs.observe(content,{childList:true});
    enhanceDrawerStructure();
  }

  function observeTable(){
    const body=q("#dataTable tbody");
    if(!body) return;
    const obs=new MutationObserver(()=>setTimeout(updateTrackingMeta,0));
    obs.observe(body,{childList:true});
    updateTrackingMeta();
  }

  function setTrackingDefaultOnDirectBase(){
    // Se a preferência antiga já abria "base", mantém o contexto do usuário.
    try{
      if(window.state?.activeTab==="base"){
        q('[data-ws-view="tracking"]')?.click();
      }
    }catch(_){}
  }

  waitForApp(()=>{
    patchShellNavigation();
    upgradeTrackingHeader();
    bindViewChips();
    observeDrawer();
    observeTable();
    updateTrackingMeta();
    setTrackingDefaultOnDirectBase();

    // Garante que abrir Acompanhamento realmente carregue a base legada.
    const tracking=q('[data-ws-view="tracking"]');
    tracking?.addEventListener("click",()=>{
      if(typeof window.loadRows === "function"){
        window.loadRows().catch(()=>{});
      }
      setTimeout(updateTrackingMeta,250);
    });
  });
})();
