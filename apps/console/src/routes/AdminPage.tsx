import { Link, Navigate, Route, Routes } from "react-router"
import { Section, Spinner } from "@cozystack/ui"
import { useAdminAccess } from "./sidebar-sections.tsx"
import { ClusterUsagePage } from "./ClusterUsagePage.tsx"
import { ClusterUsageResourcePage } from "./ClusterUsageResourcePage.tsx"
import { NodesPage } from "./NodesPage.tsx"
import { BackupClassListPage } from "./BackupClassListPage.tsx"
import { BackupClassCreatePage } from "./BackupClassCreatePage.tsx"
import { BackupClassDetailPage } from "./BackupClassDetailPage.tsx"
import { BackupClassEditPage } from "./BackupClassEditPage.tsx"
import { BackupClassAdminGuard } from "./BackupClassAdminGuard.tsx"

/**
 * Admin portal: cluster-wide operator views moved out of the tenant-facing
 * Console — Cluster Usage and the Backup Classes management added in
 * cozystack-ui#21. Mounted at /admin/* and gated by useAdminAccess (a user
 * reaches the portal if they can use at least one area). While the access
 * review is in flight we show a spinner, and a fully-denied review renders a
 * 403 notice instead of leaking any admin screen. Each area additionally
 * guards itself (the Cluster Usage page on nodes/list, the Backup Classes
 * routes via BackupClassAdminGuard on backupclasses/update).
 */
export function AdminPage() {
  const { allowed, isLoading, canClusterUsage } = useAdminAccess()

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
        <Spinner /> Loading…
      </div>
    )
  }

  if (!allowed) {
    return (
      <div className="p-6">
        <Section>
          <div className="px-2 py-4 text-sm text-slate-700">
            You do not have permission to access the Admin portal.{" "}
            <Link to="/console" className="text-blue-700 underline hover:text-blue-800">
              Back to console
            </Link>
            .
          </div>
        </Section>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        index
        element={
          <Navigate
            to={canClusterUsage ? "resources-usage" : "backups/backupclasses"}
            replace
          />
        }
      />
      <Route path="resources-usage" element={<ClusterUsagePage />} />
      <Route path="resources-usage/r/*" element={<ClusterUsageResourcePage />} />
      <Route path="resources-nodes" element={<NodesPage />} />
      <Route element={<BackupClassAdminGuard />}>
        <Route path="backups/backupclasses" element={<BackupClassListPage />} />
        <Route path="backups/backupclasses/create" element={<BackupClassCreatePage />} />
        <Route path="backups/backupclasses/:name" element={<BackupClassDetailPage />} />
        <Route path="backups/backupclasses/:name/edit" element={<BackupClassEditPage />} />
      </Route>
    </Routes>
  )
}
