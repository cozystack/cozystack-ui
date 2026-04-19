import { Link } from "react-router"
import { StatusBadge } from "@cozystack/ui"
import type {
  ApplicationDefinition,
  ApplicationInstance,
} from "@cozystack/types"
import { appDisplayName, iconDataUrl } from "../lib/app-definitions.ts"
import { readyCondition } from "../lib/status.ts"

interface InstanceCardProps {
  ad: ApplicationDefinition
  instance: ApplicationInstance
}

export function InstanceCard({ ad, instance }: InstanceCardProps) {
  const icon = iconDataUrl(ad)
  const displayKind = appDisplayName(ad)
  const ready = readyCondition(instance)
  const plural = ad.spec?.application.plural ?? ""

  return (
    <Link
      to={`/console/${plural}/${instance.metadata.name}`}
      className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-blue-300"
    >
      <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
        {icon ? (
          <img src={icon} alt={displayKind} className="h-full w-full" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-blue-700">
            {instance.metadata.name}
          </p>
          <span className="text-xs text-slate-400">{displayKind}</span>
        </div>
        <div className="mt-0.5 text-xs text-slate-500">
          {ready ? (
            <StatusBadge tone={ready.status === "True" ? "ok" : "warn"}>
              {ready.status === "True" ? "Ready" : (ready.reason ?? "NotReady")}
            </StatusBadge>
          ) : (
            <StatusBadge tone="muted">Unknown</StatusBadge>
          )}
        </div>
      </div>
    </Link>
  )
}
