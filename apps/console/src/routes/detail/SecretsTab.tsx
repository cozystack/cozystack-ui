import { useState } from "react"
import { Eye, EyeOff, Copy, ChevronDown, ChevronRight } from "lucide-react"
import {
  useK8sGet,
  useK8sList,
  type K8sResource,
} from "@cozystack/k8s-client"
import { Section, Spinner } from "@cozystack/ui"
import type { ApplicationDefinition, ApplicationInstance } from "@cozystack/types"
import { appInstanceLabel } from "../../lib/labels.ts"
import { formatAge } from "../../lib/status.ts"

const SECRETS_REF = {
  apiGroup: "",
  apiVersion: "v1",
  plural: "secrets",
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
  const [expanded, setExpanded] = useState(false)
  const { data } = useK8sGet<K8sResource<unknown, unknown> & SecretLike>(
    { ...SECRETS_REF, namespace, name },
    { enabled: revealed },
  )
  const fullValue = revealed
    ? decodeValue(data?.data?.[keyName]) || data?.stringData?.[keyName] || decodeValue(base64Value)
    : ""

  const isLarge = fullValue.split('\n').length > 5 || fullValue.length > 200

  return (
    <div className="flex items-start justify-between gap-3 px-5 py-2 text-sm">
      <code className="shrink-0 text-xs text-slate-500 pt-1">{keyName}</code>
      <div className="flex-1">
        {revealed ? (
          <>
            <pre className={`whitespace-pre-wrap break-all font-mono text-[11px] leading-tight overflow-auto rounded bg-slate-900 text-slate-100 p-2 ${
              expanded ? 'max-h-96' : 'max-h-20'
            }`}>
              {fullValue || "(empty)"}
            </pre>
            {isLarge && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-1 text-xs text-blue-600 hover:text-blue-700"
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </>
        ) : (
          <span className="text-slate-400">••••••••</span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1 pt-1">
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          className="rounded p-1 text-slate-500 hover:bg-slate-100"
          title={revealed ? "Hide" : "Reveal"}
        >
          {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        </button>
        <button
          type="button"
          disabled={!revealed}
          onClick={() => navigator.clipboard.writeText(fullValue)}
          className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
          title="Copy"
        >
          <Copy className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

function SecretItem({
  secret,
  namespace,
}: {
  secret: K8sResource & SecretLike
  namespace: string
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const keys = Object.keys(secret.data ?? {})

  return (
    <li>
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3 text-sm hover:bg-slate-50"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="size-4 shrink-0 text-slate-400" />
          ) : (
            <ChevronRight className="size-4 shrink-0 text-slate-400" />
          )}
          <div className="text-left">
            <p className="font-mono text-xs text-slate-800">
              {secret.metadata.name}
            </p>
            <p className="text-xs text-slate-500">
              {secret.type ?? "Opaque"} · {keys.length} key{keys.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <span className="tabular-nums text-xs text-slate-500">
          {formatAge(secret.metadata.creationTimestamp)}
        </span>
      </button>
      {isExpanded && keys.length > 0 && (
        <div className="border-t border-slate-100 bg-slate-50">
          {keys.map((k) => (
            <SecretRow
              key={k}
              namespace={namespace}
              name={secret.metadata.name}
              keyName={k}
              base64Value={secret.data?.[k] ?? ""}
            />
          ))}
        </div>
      )}
    </li>
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
  const labelSelector = [
    appInstanceLabel(ad, instance),
    "internal.cozystack.io/tenantresource=false",
  ].join(",")

  const { data, isLoading } = useK8sList<K8sResource & SecretLike>(
    { ...SECRETS_REF, namespace: ns },
    { labelSelector },
  )
  const items = data?.items ?? []
  return (
    <div className="p-6">
      <Section title="Secrets" bodyClassName="p-0">
        {isLoading ? (
          <div className="flex items-center gap-2 px-5 py-4 text-xs text-slate-500">
            <Spinner /> Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="px-5 py-6 text-sm text-slate-500">No secrets.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((sec) => (
              <SecretItem key={sec.metadata.name} secret={sec} namespace={ns} />
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}
