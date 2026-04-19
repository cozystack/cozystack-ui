import { Link } from "react-router"
import { ArrowRight } from "lucide-react"
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
  const singular = ad.spec?.application.singular ?? "instance"
  return (
    <Link
      to={to}
      className="group flex min-h-[200px] flex-col rounded-lg border border-slate-200 bg-white p-5 transition-shadow hover:shadow-sm"
    >
      <div className="size-12 shrink-0 overflow-hidden rounded-md bg-slate-100">
        {icon ? (
          <img src={icon} alt={name} className="h-full w-full" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-400">
            {name.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{name}</h3>
      {description && (
        <p className="mt-1.5 line-clamp-3 text-sm text-slate-500">{description}</p>
      )}
      <div className="mt-auto pt-4 text-sm font-medium text-blue-600 group-hover:underline">
        Create {singular}{" "}
        <ArrowRight className="ml-0.5 inline size-3.5 -translate-y-px transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  )
}
