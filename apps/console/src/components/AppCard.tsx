import { Link } from "react-router"
import type { ApplicationDefinition } from "@cozystack/types"
import { appDisplayName, iconDataUrl } from "../lib/app-definitions.ts"
import { humanizeKind } from "../lib/humanize.ts"

interface AppCardProps {
  ad: ApplicationDefinition
  to: string
}

export function AppCard({ ad, to }: AppCardProps) {
  const icon = iconDataUrl(ad)
  const name = humanizeKind(ad.spec?.application.kind ?? appDisplayName(ad))
  const description = ad.spec?.dashboard?.description ?? ""
  return (
    <Link
      to={to}
      className="group block rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
    >
      <div className="mb-4 flex size-12 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
        {icon ? (
          <img src={icon} alt="" className="h-full w-full" />
        ) : (
          <span className="text-sm font-semibold text-slate-400">
            {name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{name}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <span className="mt-4 inline-block text-sm font-medium text-blue-600 group-hover:underline">
        Deploy &rarr;
      </span>
    </Link>
  )
}
