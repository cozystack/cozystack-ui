import yaml from "js-yaml"
import { StatusBadge } from "@cozystack/ui"
import type {
  ApplicationDefinition,
  ApplicationInstance,
} from "@cozystack/types"
import { appDisplayName, iconDataUrl } from "../../lib/app-definitions.ts"
import { formatAge, readyCondition } from "../../lib/status.ts"

interface OverviewTabProps {
  ad: ApplicationDefinition
  instance: ApplicationInstance
}

export function OverviewTab({ ad, instance }: OverviewTabProps) {
  const ready = readyCondition(instance)
  const icon = iconDataUrl(ad)
  return (
    <div className="grid gap-6 p-6 md:grid-cols-3">
      <div className="space-y-4 md:col-span-1">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
              {icon ? (
                <img src={icon} alt="" className="h-full w-full" />
              ) : null}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">
                {appDisplayName(ad)}
              </p>
              <p className="text-lg font-semibold text-slate-900">
                {instance.metadata.name}
              </p>
            </div>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Status</dt>
              <dd>
                {ready ? (
                  <StatusBadge tone={ready.status === "True" ? "ok" : "warn"}>
                    {ready.status === "True" ? "Ready" : (ready.reason ?? "NotReady")}
                  </StatusBadge>
                ) : (
                  <StatusBadge tone="muted">Unknown</StatusBadge>
                )}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Namespace</dt>
              <dd className="font-mono text-xs text-slate-700">
                {instance.metadata.namespace}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Age</dt>
              <dd className="text-slate-700">
                {formatAge(instance.metadata.creationTimestamp)}
              </dd>
            </div>
            {instance.status?.version && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Version</dt>
                <dd className="font-mono text-xs text-slate-700">
                  {instance.status.version}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
      <div className="md:col-span-2">
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
            Spec
          </div>
          <pre className="max-h-[60vh] overflow-auto p-4 text-xs leading-relaxed text-slate-800">
            {yaml.dump(instance.spec ?? {})}
          </pre>
        </div>
      </div>
    </div>
  )
}
