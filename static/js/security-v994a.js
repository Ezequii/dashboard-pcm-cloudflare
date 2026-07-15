(() => {
  "use strict";

  let policy = null;
  let context = {
    initialized: false,
    verified: false,
    role: "",
    email: "",
    groups: [],
    classification: "interno",
    localDevelopment: false,
    error: ""
  };
  let initializationPromise = null;

  class AccessVerificationError extends Error {
    constructor(message){
      super(message);
      this.name = "AccessVerificationError";
    }
  }

  function isLocalDevelopment(){
    return (
      location.protocol === "file:"
      || location.hostname === "localhost"
      || location.hostname === "127.0.0.1"
      || location.hostname === "::1"
    );
  }

  async function fetchJson(url, timeoutMs=12000){
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort("timeout"), timeoutMs);
    try{
      const response = await fetch(
        `${url}${url.includes("?") ? "&" : "?"}v=${encodeURIComponent(window.PCM_APP_CONFIG?.assetVersion || "9943")}`,
        {
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
          headers: {"Accept":"application/json"}
        }
      );
      if(!response.ok){
        throw new AccessVerificationError(
          `Não foi possível validar o acesso corporativo (${response.status}).`
        );
      }
      return await response.json();
    }catch(error){
      if(error?.name === "AbortError"){
        throw new AccessVerificationError(
          "A validação do acesso corporativo excedeu o tempo limite."
        );
      }
      throw error;
    }finally{
      clearTimeout(timer);
    }
  }

  function values(value){
    if(Array.isArray(value)) return value.map(String);
    if(value === null || value === undefined || value === "") return [];
    return [String(value)];
  }

  function resolveRole(identity){
    const mappings = policy?.roleMappings || {};
    const email = String(identity?.email || identity?.user_email || "").toLowerCase();
    const groups = [
      ...values(identity?.groups),
      ...values(identity?.custom?.groups),
      ...values(identity?.identity?.groups)
    ].map(group => group.toLowerCase());

    const adminEmails = values(mappings.adminEmails).map(item => item.toLowerCase());
    const leadershipEmails = values(mappings.leadershipEmails).map(item => item.toLowerCase());
    const adminGroups = values(mappings.adminGroups).map(item => item.toLowerCase());
    const leadershipGroups = values(mappings.leadershipGroups).map(item => item.toLowerCase());

    if(adminEmails.includes(email) || groups.some(group => adminGroups.includes(group))){
      return "admin";
    }
    if(
      leadershipEmails.includes(email)
      || groups.some(group => leadershipGroups.includes(group))
    ){
      return "leadership";
    }
    return String(policy?.defaultRole || "viewer");
  }

  function render(){
    const host = document.getElementById("securityContextV994a");
    const role = document.getElementById("securityRoleV994a");
    const classification = document.getElementById("securityClassificationV994a");

    if(role){
      role.textContent = context.verified
        ? `Acesso: ${context.role === "leadership" ? "Liderança" : context.role === "admin" ? "Administrador" : "Visualizador"}`
        : "Acesso: não verificado";
    }
    if(classification){
      classification.textContent = context.verified
        ? `Dados ${context.classification}`
        : "Dados bloqueados";
    }
    if(host){
      host.classList.toggle("is-verified", context.verified);
      host.classList.toggle("is-blocked", !context.verified);
      host.title = context.email
        ? `${context.email} · classificação ${context.classification}`
        : context.error || "Contexto de acesso";
    }
  }

  async function initialize(){
    if(initializationPromise) return initializationPromise;

    initializationPromise = (async () => {
      policy = await fetchJson(
        window.PCM_APP_CONFIG?.configFiles?.security
          || "/static/config/security-config.json"
      );
      context.classification = String(
        policy.dataClassification || "interno"
      );

      if(isLocalDevelopment() && policy.localDevelopmentAllowed !== false){
        context = {
          ...context,
          initialized: true,
          verified: true,
          role: "admin",
          email: "desenvolvimento-local",
          groups: ["local-development"],
          localDevelopment: true,
          error: ""
        };
        state.securityRole = context.role;
        state.securityVerified = true;
        render();
        return {...context};
      }

      if(!policy.accessRequired && policy.anonymousAccessAllowed){
        context = {
          ...context,
          initialized: true,
          verified: true,
          role: String(policy.defaultRole || "viewer"),
          error: ""
        };
        state.securityRole = context.role;
        state.securityVerified = true;
        render();
        return {...context};
      }

      try{
        const identity = await fetchJson(
          policy.identityEndpoint || "/cdn-cgi/access/get-identity"
        );
        const role = resolveRole(identity);
        const allowedRoles = values(policy.allowedRoles);
        if(!allowedRoles.includes(role)){
          throw new AccessVerificationError(
            "Seu perfil não está autorizado para esta aplicação."
          );
        }

        context = {
          ...context,
          initialized: true,
          verified: true,
          role,
          email: String(identity?.email || identity?.user_email || ""),
          groups: values(identity?.groups),
          error: ""
        };
      }catch(error){
        context = {
          ...context,
          initialized: true,
          verified: false,
          role: "",
          error: String(error?.message || error)
        };
        if(policy.failClosed !== false){
          state.securityRole = "";
          state.securityVerified = false;
          render();
          throw error instanceof AccessVerificationError
            ? error
            : new AccessVerificationError(context.error);
        }
      }

      state.securityRole = context.role;
      state.securityVerified = context.verified;
      render();
      return {...context};
    })();

    try{
      return await initializationPromise;
    }catch(error){
      initializationPromise = null;
      throw error;
    }
  }

  function canViewOperationalData(){
    return Boolean(context.verified);
  }

  function canExport(){
    return Boolean(
      context.verified
      && ["viewer", "leadership", "admin"].includes(context.role)
    );
  }

  function canViewSensitiveFields(){
    return Boolean(
      context.verified
      && ["leadership", "admin"].includes(context.role)
    );
  }


  function renderOperationalAccessDenied(){
    const table = document.getElementById("dataTable");
    if(!table) return;

    const thead = table.querySelector("thead");
    const tbody = table.querySelector("tbody");
    if(thead) thead.innerHTML = "";
    if(tbody){
      tbody.innerHTML = `
        <tr>
          <td>
            <div class="operational-access-denied-v994a">
              <div>
                <strong>Base operacional protegida</strong>
                <span>${String(
                  context.error
                  || "Confirme o acesso corporativo para visualizar os registros."
                ).replace(/[<>&"']/g, "")}</span>
              </div>
            </div>
          </td>
        </tr>`;
    }

    const counter = document.getElementById("tableCounter");
    if(counter) counter.textContent = "Acesso operacional não verificado";
  }

  function assertOperationalAccess(){
    if(!canViewOperationalData()){
      throw new AccessVerificationError(
        context.error || "A Base de Tratativa exige acesso corporativo verificado."
      );
    }
  }

  window.renderOperationalAccessDeniedV994a = renderOperationalAccessDenied;
  window.AccessVerificationError = AccessVerificationError;
  window.SecurityV994a = Object.freeze({
    initialize,
    isVerified: () => Boolean(context.verified),
    getRole: () => context.role,
    canViewOperationalData,
    canExport,
    canViewSensitiveFields,
    assertOperationalAccess,
    renderOperationalAccessDenied,
    getContext: () => ({...context})
  });
})();
