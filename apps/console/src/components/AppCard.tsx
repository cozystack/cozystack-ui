import { Link } from "react-router"
import type { ApplicationDefinition } from "@cozystack/types"
import {
  appDisplayName,
  iconDataUrl,
} from "../lib/app-definitions.ts"

interface AppCardProps {
  ad: ApplicationDefinition
  to: string
}

export function AppCard({ ad, to }: AppCardProps) {
  const icon = iconDataUrl(ad)
  const name = appDisplayName(ad)
  const description = ad.spec?.dashboard?.description ?? ""
  const category = ad.spec?.dashboard?.category ?? "Other"
  return (
    <Link
      to={to}
      className="group flex gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-blue-300 hover:shadow-md"
    >
      <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
        {icon ? (
          <img src={icon} alt={name} className="h-full w-full" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-400">
            {name.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate font-semibold text-slate-900 group-hover:text-blue-700">
            {name}
          </h3>
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            {category}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-slate-600">{description}</p>
      </div>
    </Link>
  )
}
