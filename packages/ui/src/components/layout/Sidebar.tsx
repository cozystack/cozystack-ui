import { useState, type ComponentType, type ReactNode } from "react"
import { NavLink, useLocation } from "react-router"
import { ChevronUp } from "lucide-react"
import { cn } from "../../lib/utils.ts"

export interface SidebarItem {
  label: string
  to: string
  icon?: ComponentType<{ className?: string }>
  badge?: ReactNode
  end?: boolean
}

export interface SidebarSection {
  title: string
  items: SidebarItem[]
}

interface SidebarProps {
  sections: SidebarSection[]
}

export function Sidebar({ sections }: SidebarProps) {
  const location = useLocation()
  const search = location.search
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sections.map((s) => [s.title, true])),
  )

  if (sections.length === 0) return null

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }))
  }

  return (
    <aside className="w-52 shrink-0 border-r border-slate-200 bg-white">
      <nav className="py-3">
        {sections.map((section) => (
          <div key={section.title} className="mb-1">
            <button
              type="button"
              onClick={() => toggleSection(section.title)}
              className="flex w-full items-center justify-between px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600"
            >
              {section.title}
              <ChevronUp
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  !openSections[section.title] && "rotate-180",
                )}
              />
            </button>
            {openSections[section.title] && (
              <div className="mt-0.5 space-y-0.5 px-2">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={`${item.to}${search}`}
                    end={item.end ?? false}
                    className={({ isActive }) =>
                      cn(
                        "flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] transition-colors",
                        isActive
                          ? "bg-blue-50 font-medium text-blue-700"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {item.icon && (
                          <item.icon
                            className={cn(
                              "h-4 w-4 shrink-0",
                              isActive ? "text-blue-500" : "text-slate-400",
                            )}
                          />
                        )}
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge != null && (
                          <span className="shrink-0 text-xs text-slate-400">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  )
}
