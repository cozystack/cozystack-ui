import { useState } from "react"
import { Eye, EyeOff, Copy } from "lucide-react"
import {
  useK8sGet,
  useK8sList,
  type K8sResource,
} from "@cozystack/k8s-client"
import { Spinner } from "@cozystack/ui"
import type { ApplicationDefinition, ApplicationInstance } from "@cozystack/types"
import { appInstanceLabel } from "../../lib/labels.ts"
import { formatAge } from "../../lib/status.ts"

/**
 * Cozystack stores credentials in TenantSecret (core.cozystack.io/v1alpha1)
 * which mirrors a regular Secret but is scoped to the tenant.
 */
const TENANT_SECRETS_REF = {
  apiGroup: "core.cozystack.io",
  apiVersion: "v1alpha1",
  plural: "tenantsecrets",
}

interface SecretLike {
  type?: string
  data?: Record<string, string>
  stringData?: Record<string, string>
}

function decodeValue(raw: string | undefined): string {
  if (!raw) return ""
  try {
    return atob(raw)
  } catch {
    return raw
  }
}

function SecretRow({
  namespace,
  name,
  keyName,
  base64Value,
}: {
  namespace: string
  name: string
  keyName: string
  base64Value: string
}) {
  const [revealed, setRevealed] = useState(false)
  const { data } = useK8sGet<K8sResource<unknown, unknown> & SecretLike>(
    { ...TENANT_SECRETS_REF, namespace, name },
    { enabled: revealed },
  )
  const fullValue = revealed
    ? decodeValue(data?.data?.[keyName]) || data?.stringData?.[keyName] || decodeValue(base64Value)
    : ""
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
      <code className="text-xs text-slate-500">{keyName}</code>
      <div className="flex flex-1 items-center gap-2 font-mono text-xs text-slate-800">
        {revealed ? (
          <span className="break-all">{fullValue || "(empty)"}</span>
        ) : (
          <span className="text-slate-400">••••••••</span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
          title={revealed ? "Hide" : "Reveal"}
        >
          {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          disabled={!revealed}
          onClick={() => navigator.clipboard.writeText(fullValue)}
          className="rounded-md p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
          title="Copy"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

export function SecretsTab({
  ad,
  instance,
}: {
  ad: ApplicationDefinition
  instance: ApplicationInstance
}) {
  const ns = instance.metadata.namespace ?? ""
  const { data, isLoading } = useK8sList<K8sResource & SecretLike>(
    { ...TENANT_SECRETS_REF, namespace: ns },
    { labelSelector: appInstanceLabel(ad, instance) },
  )
  const items = data?.items ?? []
  return (
    <div className="p-6">
      <div className="rounded-lg border border-slate-200 bg-white">
        <header className="border-b border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
          Tenant secrets
        </header>
        {isLoading ? (
          <div className="flex items-center gap-2 px-4 py-3 text-xs text-slate-500">
            <Spinner /> Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-500">No tenant secrets.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((sec) => {
              const keys = Object.keys(sec.data ?? {})
              return (
                <li key={sec.metadata.name}>
                  <div className="flex items-center justify-between px-4 py-2 text-sm">
                    <div>
                      <p className="font-mono text-xs text-slate-800">
                        {sec.metadata.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {sec.type ?? "Opaque"}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500">
                      {formatAge(sec.metadata.creationTimestamp)}
                    </span>
                  </div>
                  {keys.length > 0 && (
                    <div className="border-t border-slate-100 bg-slate-50">
                      {keys.map((k) => (
                        <SecretRow
                          key={k}
                          namespace={ns}
                          name={sec.metadata.name}
                          keyName={k}
                          base64Value={sec.data?.[k] ?? ""}
                        />
                      ))}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
