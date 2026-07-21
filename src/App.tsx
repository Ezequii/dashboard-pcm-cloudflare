import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { AlertCircle, LoaderCircle } from "lucide-react";
import { AppShell } from "./components/AppShell";
import type { AppPage, OsOrcDataset, OsOrcRecord } from "./types/osOrc";


const OverviewPage = lazy(() =>
  import("./pages/OverviewPage").then((module) => ({ default: module.OverviewPage }))
);

const ConsultaPage = lazy(() =>
  import("./pages/ConsultaPage").then((module) => ({ default: module.ConsultaPage }))
);

function PageFallback() {
  return (
    <div className="page-loading" role="status" aria-live="polite">
      <div className="page-loading__bar" />
      <div className="page-loading__grid">
        <div className="page-loading__card" />
        <div className="page-loading__card" />
        <div className="page-loading__card" />
        <div className="page-loading__card" />
      </div>
      <div className="page-loading__panel" />
    </div>
  );
}

function pageFromHash(): AppPage {
  return window.location.hash === "#consulta" ? "consulta" : "overview";
}

export default function App() {
  const [dataset, setDataset] = useState<OsOrcDataset | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState<AppPage>(pageFromHash);
  const [recordToOpen, setRecordToOpen] = useState<OsOrcRecord | null>(null);
  const [consultaPreset, setConsultaPreset] = useState<{ supplier?: string; requester?: string; status?: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/data/os-orc.json", {
      signal: controller.signal,
      credentials: "same-origin",
      cache: "no-store"
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Falha ao carregar a base (${response.status}).`);
        }
        return response.json() as Promise<OsOrcDataset>;
      })
      .then((payload) => {
        setDataset(payload);
        setError("");
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Falha ao carregar a base.");
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const handleHash = () => setPage(pageFromHash());
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const handlePageChange = useCallback((next: AppPage) => {
    window.location.hash = next === "consulta" ? "consulta" : "overview";
    setPage(next);
  }, []);

  const handleOpenRecord = useCallback(
    (record: OsOrcRecord) => {
      setRecordToOpen(record);
      handlePageChange("consulta");
    },
    [handlePageChange]
  );

  const handleOpenConsulta = useCallback(
    (preset: { supplier?: string; requester?: string; status?: string }) => {
      setConsultaPreset(preset);
      handlePageChange("consulta");
    },
    [handlePageChange]
  );

  if (error) {
    return (
      <div className="app-state">
        <img src="/branding/amaggi-logo.png" alt="AMAGGI" />
        <AlertCircle size={34} />
        <h1>Não foi possível carregar a base</h1>
        <p>{error}</p>
        <button type="button" className="primary-button" onClick={() => window.location.reload()}>
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="app-state">
        <img src="/branding/amaggi-logo.png" alt="AMAGGI" />
        <LoaderCircle className="spin" size={34} />
        <h1>Carregando OS &amp; Orçamentos</h1>
        <p>Preparando os indicadores e a consulta operacional.</p>
      </div>
    );
  }

  return (
    <AppShell
      page={page}
      onPageChange={handlePageChange}
      metadata={dataset.metadata}
    >
      <Suspense fallback={<PageFallback />}>
        {page === "overview" ? (
          <OverviewPage
            records={dataset.records}
            metadata={dataset.metadata}
            onOpenRecord={handleOpenRecord}
            onOpenConsulta={handleOpenConsulta}
          />
        ) : (
          <ConsultaPage
            records={dataset.records}
            initialRecord={recordToOpen}
            onInitialRecordConsumed={() => setRecordToOpen(null)}
            preset={consultaPreset}
            onPresetConsumed={() => setConsultaPreset(null)}
          />
        )}
      </Suspense>
    </AppShell>
  );
}
