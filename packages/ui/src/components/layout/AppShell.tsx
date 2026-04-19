import type { ReactNode } from "react"
import { Outlet } from "react-router"
import { Header } from "./Header.tsx"
import { Sidebar, type SidebarSection } from "./Sidebar.tsx"

interface AppShellProps {
  sections: SidebarSection[]
  tenantSelector?: ReactNode
  userMenu?: ReactNode
  headerExtras?: ReactNode
  subtitle?: ReactNode
  children?: ReactNode
}

export function AppShell({
  sections,
  tenantSelector,
  userMenu,
  headerExtras,
  subtitle,
  children,
}: AppShellProps) {
  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <Header
        tenantSelector={tenantSelector}
        userMenu={userMenu}
        extras={headerExtras}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar sections={sections} />
        <div className="flex flex-1 flex-col overflow-hidden">
          {subtitle && (
            <div className="flex items-center gap-1.5 border-b border-slate-200 bg-white px-6 py-2 text-sm text-slate-600">
              {subtitle}
            </div>
          )}
          <main className="flex-1 overflow-auto">{children ?? <Outlet />}</main>
        </div>
      </div>
    </div>
  )
}
