import { Route, Routes } from "react-router"
import { ConsoleOverview } from "./ConsoleOverview.tsx"
import { TenantsPage } from "./TenantsPage.tsx"
import { ApplicationListPage } from "./ApplicationListPage.tsx"
import { ApplicationDetailPage } from "./detail/ApplicationDetailPage.tsx"
import { ApplicationEditRoute } from "./detail/ApplicationEditRoute.tsx"

export function ConsolePage() {
  return (
    <Routes>
      <Route index element={<ConsoleOverview />} />
      <Route path="tenants" element={<TenantsPage />} />
      <Route path=":plural/:name/edit" element={<ApplicationEditRoute />} />
      <Route path=":plural/:name/*" element={<ApplicationDetailPage />} />
      <Route path=":plural" element={<ApplicationListPage />} />
    </Routes>
  )
}
