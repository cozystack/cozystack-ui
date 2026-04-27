import { Navigate, Route, Routes, useLocation } from "react-router"
import { AppShell } from "@cozystack/ui"
import { TenantProvider } from "./lib/tenant-context.tsx"
import { Breadcrumb } from "./components/Breadcrumb.tsx"
import { MarketplacePage } from "./routes/MarketplacePage.tsx"
import { ConsolePage } from "./routes/ConsolePage.tsx"
import {
  useConsoleSidebarSections,
  useMarketplaceSidebarSections,
} from "./routes/sidebar-sections.tsx"
import { CommandPaletteProvider, useCommandPalette } from "./components/command-palette/command-palette-provider.tsx"
import { CommandPalette } from "./components/command-palette/command-palette.tsx"

function Shell() {
  const { pathname } = useLocation()
  const inMarketplace = pathname.startsWith("/marketplace")
  const marketplaceSections = useMarketplaceSidebarSections()
  const consoleSections = useConsoleSidebarSections()
  const sections = inMarketplace ? marketplaceSections : consoleSections
  const { toggle } = useCommandPalette()

  return (
    <AppShell sections={sections} subtitle={<Breadcrumb />} onSearchClick={toggle}>
      <CommandPalette />
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
      <CommandPaletteProvider>
        <Shell />
      </CommandPaletteProvider>
    </TenantProvider>
  )
}
