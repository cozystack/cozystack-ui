import { useK8sList } from "@cozystack/k8s-client"
import type { K8sResource } from "@cozystack/k8s-client"

interface ResourceQuotaSpec {
  hard?: Record<string, string>
}

interface ResourceQuotaStatus {
  hard?: Record<string, string>
  used?: Record<string, string>
}

interface ResourceQuota extends K8sResource<ResourceQuotaSpec, ResourceQuotaStatus> {
  kind: "ResourceQuota"
}

function parseQuantity(s: string): number {
  if (!s) return 0
  if (s.endsWith("m")) return parseFloat(s) / 1000
  if (s.endsWith("Ki")) return parseFloat(s) * 1024
  if (s.endsWith("Mi")) return parseFloat(s) * 1024 ** 2
  if (s.endsWith("Gi")) return parseFloat(s) * 1024 ** 3
  if (s.endsWith("Ti")) return parseFloat(s) * 1024 ** 4
  if (s.endsWith("k") || s.endsWith("K")) return parseFloat(s) * 1000
  if (s.endsWith("M")) return parseFloat(s) * 1000 ** 2
  if (s.endsWith("G")) return parseFloat(s) * 1000 ** 3
  return parseFloat(s) || 0
}

function humanizeBytes(bytes: number): string {
  if (bytes >= 1024 ** 4) return `${(bytes / 1024 ** 4).toFixed(1)}Ti`
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)}Gi`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)}Mi`
  return `${bytes}B`
}

function humanizeCpu(val: number): string {
  if (val < 1) return `${Math.round(val * 1000)}m`
  return `${val % 1 === 0 ? val : val.toFixed(2)}`
}

interface QuotaEntry {
  label: string
  usedRaw: string
  hardRaw: string
  usedNum: number
  hardNum: number
  pct: number
  display: string
}

const DISPLAY_KEYS: Array<{
  key: string
  label: string
  format: (n: number) => string
  preferKey?: string
}> = [
  { key: "limits.cpu", label: "CPU", format: humanizeCpu },
  { key: "limits.memory", label: "Memory", format: humanizeBytes },
  { key: "requests.storage", label: "Storage", format: humanizeBytes },
  { key: "services.loadbalancers", label: "Load Balancers", format: (n) => String(n) },
  { key: "persistentvolumeclaims", label: "PVCs", format: (n) => String(n) },
]

function buildEntries(hard: Record<string, string>, used: Record<string, string>): QuotaEntry[] {
  const entries: QuotaEntry[] = []
  for (const { key, label, format } of DISPLAY_KEYS) {
    const hardRaw = hard[key]
    if (!hardRaw) continue
    const usedRaw = used[key] ?? "0"
    const hardNum = parseQuantity(hardRaw)
    const usedNum = parseQuantity(usedRaw)
    if (hardNum <= 0) continue
    const pct = Math.min(100, (usedNum / hardNum) * 100)
    entries.push({
      label,
      usedRaw,
      hardRaw,
      usedNum,
      hardNum,
      pct,
      display: `${format(usedNum)} / ${format(hardNum)}`,
    })
  }
  return entries
}

function barColor(pct: number): string {
  if (pct >= 90) return "bg-red-500"
  if (pct >= 70) return "bg-amber-400"
  return "bg-blue-500"
}

function textColor(pct: number): string {
  if (pct >= 90) return "text-red-600"
  if (pct >= 70) return "text-amber-600"
  return "text-slate-500"
}

interface QuotaBarsProps {
  hard: Record<string, string>
  used: Record<string, string>
  compact?: boolean
}

export function QuotaBars({ hard, used, compact = false }: QuotaBarsProps) {
  const entries = buildEntries(hard, used)
  if (entries.length === 0) return null

  if (compact) {
    return (
      <div className="flex gap-2">
        {entries.map((e) => (
          <div key={e.label} title={`${e.label}: ${e.display}`} className="flex flex-col gap-0.5 min-w-[48px]">
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-500 truncate">{e.label}</span>
              <span className={`${textColor(e.pct)} font-medium`}>{Math.round(e.pct)}%</span>
            </div>
            <div className="h-1 w-full rounded-full bg-slate-100">
              <div
                className={`h-1 rounded-full transition-all ${barColor(e.pct)}`}
                style={{ width: `${e.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {entries.map((e) => (
        <div key={e.label}>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">{e.label}</span>
            <span className={`text-xs font-medium ${textColor(e.pct)}`}>
              {e.display}
              {e.pct >= 70 && <span className="ml-1.5">({Math.round(e.pct)}%)</span>}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100">
            <div
              className={`h-2 rounded-full transition-all ${barColor(e.pct)}`}
              style={{ width: `${e.pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

interface QuotaPanelProps {
  namespace: string
}

export function QuotaPanel({ namespace }: QuotaPanelProps) {
  const { data, isLoading } = useK8sList<ResourceQuota>(
    { apiGroup: "", apiVersion: "v1", plural: "resourcequotas", namespace },
    { enabled: !!namespace }
  )

  if (isLoading) return null

  const quotas = data?.items ?? []
  if (quotas.length === 0) return null

  const hard: Record<string, string> = {}
  const used: Record<string, string> = {}

  for (const q of quotas) {
    Object.assign(hard, q.status?.hard ?? {})
    Object.assign(used, q.status?.used ?? {})
  }

  const entries = buildEntries(hard, used)
  if (entries.length === 0) return null

  const hasWarning = entries.some((e) => e.pct >= 70)
  const hasCritical = entries.some((e) => e.pct >= 90)

  return (
    <div className={`rounded-lg border p-4 ${hasCritical ? "border-red-200 bg-red-50" : hasWarning ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Resource Quotas</h3>
        {hasCritical && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Critical</span>}
        {!hasCritical && hasWarning && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Warning</span>}
      </div>
      <QuotaBars hard={hard} used={used} />
    </div>
  )
}

export function TenantQuotaCompact({ namespace }: { namespace: string }) {
  const { data, isLoading } = useK8sList<ResourceQuota>(
    { apiGroup: "", apiVersion: "v1", plural: "resourcequotas", namespace },
    { enabled: !!namespace }
  )

  if (isLoading || !data?.items?.length) return <span className="text-xs text-slate-400">—</span>

  const hard: Record<string, string> = {}
  const used: Record<string, string> = {}
  for (const q of data.items) {
    Object.assign(hard, q.status?.hard ?? {})
    Object.assign(used, q.status?.used ?? {})
  }

  const entries = buildEntries(hard, used)
  if (entries.length === 0) return <span className="text-xs text-slate-400">—</span>

  return <QuotaBars hard={hard} used={used} compact />
}
