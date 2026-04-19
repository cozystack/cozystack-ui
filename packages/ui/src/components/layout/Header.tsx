import type { ReactNode } from "react"
import { Link, useLocation } from "react-router"
import { Logo } from "../Logo.tsx"
import { cn } from "../../lib/utils.ts"

interface HeaderProps {
  tenantSelector?: ReactNode
  userMenu?: ReactNode
  extras?: ReactNode
}

const tabs = [
  { id: "marketplace", label: "Marketplace", to: "/marketplace" },
  { id: "console", label: "Console", to: "/console" },
]

export function Header({ tenantSelector, userMenu, extras }: HeaderProps) {
  const location = useLocation()
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center">
          <Logo className="h-6 w-auto" />
        </Link>
        <nav className="flex items-center gap-1">
          {tabs.map((t) => {
            const active = location.pathname.startsWith(t.to)
            return (
              <Link
                key={t.id}
                to={t.to}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-blue-50 font-semibold text-blue-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                {t.label}
              </Link>
            )
          })}
        </nav>
      </div>
      <div className="flex items-center gap-2">
        {tenantSelector}
        {extras}
        {userMenu}
      </div>
    </header>
  )
}
