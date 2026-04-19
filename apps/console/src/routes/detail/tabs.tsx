import { NavLink } from "react-router"
import { cn } from "@cozystack/ui"

export interface Tab {
  to: string
  label: string
  end?: boolean
}

export function TabBar({ tabs }: { tabs: Tab[] }) {
  return (
    <div className="flex gap-1 border-b border-slate-200 bg-white px-6">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end ?? false}
          className={({ isActive }) =>
            cn(
              "border-b-2 px-3 py-2 text-sm transition-colors",
              isActive
                ? "border-blue-600 font-medium text-blue-700"
                : "border-transparent text-slate-600 hover:text-slate-900",
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  )
}
