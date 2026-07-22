import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import OverviewPage from "@/pages/OverviewPage";
import TrackingPage from "@/pages/TrackingPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import ImportsPage from "@/pages/ImportsPage";
import SettingsPage from "@/pages/SettingsPage";
import TvPage from "@/pages/TvPage";

export default function App() {
  return <Routes>
    <Route path="/tv" element={<TvPage />} />
    <Route element={<AppShell />}>
      <Route index element={<OverviewPage />} />
      <Route path="acompanhamento" element={<TrackingPage />} />
      <Route path="analises" element={<AnalyticsPage />} />
      <Route path="importacoes" element={<ImportsPage />} />
      <Route path="configuracoes" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  </Routes>;
}
