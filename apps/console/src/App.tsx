import { Navigate, Route, Routes } from "react-router"
import { AppShell } from "@cozystack/ui"
import { TenantProvider } from "./lib/tenant-context.tsx"
import { Breadcrumb } from "./components/Breadcrumb.tsx"
import { MarketplacePage } from "./routes/MarketplacePage.tsx"
import { ConsolePage } from "./routes/ConsolePage.tsx"
import { useSidebarSections } from "./routes/sidebar-sections.tsx"

function Shell() {
  const sections = useSidebarSections()
  return (
    <AppShell sections={sections} subtitle={<Breadcrumb />}>
      <Routes>
        <Route path="/" element={<Navigate to="/marketplace" replace />} />
        <Route path="/marketplace/*" element={<MarketplacePage />} />
        <Route path="/console/*" element={<ConsolePage />} />
      </Routes>
    </AppShell>
  )
}

export default function App() {
  return (
    <TenantProvider>
      <Shell />
    </TenantProvider>
  )
}
