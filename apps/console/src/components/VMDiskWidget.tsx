import { useEffect, useRef } from "react"
import type { WidgetProps } from "@rjsf/utils"
import { useK8sList } from "@cozystack/k8s-client"
import { APPS_GROUP, APPS_VERSION } from "@cozystack/types"
import { useTenantContext } from "../lib/tenant-context.tsx"

interface VMDisk {
  apiVersion: string
  kind: string
  metadata: {
    name: string
    namespace: string
  }
  spec: {
    storage: string
    storageClass?: string
  }
}

export function VMDiskWidget(props: WidgetProps) {
  const { value, onChange, required, disabled, readonly } = props
  const { tenantNamespace } = useTenantContext()

  const { data: diskList, isLoading } = useK8sList<VMDisk>({
    apiGroup: APPS_GROUP,
    apiVersion: APPS_VERSION,
    plural: "vmdisks",
    namespace: tenantNamespace ?? undefined,
  })

  const disks = diskList?.items || []

  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Auto-select first disk if required and no value set.
  // `disks` is intentionally omitted from deps: a new array reference from k8s watch
  // would otherwise re-run this effect and overwrite a user's selection.
  // `onChange` is also excluded — it changes reference every render.
  useEffect(() => {
    if (required && !value && disks.length > 0 && !isLoading) {
      onChangeRef.current(disks[0].metadata.name)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [required, value, isLoading])

  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value || undefined)}
      disabled={disabled || readonly || isLoading}
      required={required}
      className="w-full rounded-lg border border-slate-300 bg-white pl-3 pr-8 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {!required && <option value="">-- None --</option>}
      {isLoading ? (
        <option value="">Loading...</option>
      ) : disks.length === 0 ? (
        <option value="" disabled>
          No disks available
        </option>
      ) : (
        disks.map((disk) => {
          const label = `${disk.metadata.name} (${disk.spec.storage})`
          return (
            <option key={disk.metadata.name} value={disk.metadata.name}>
              {label}
            </option>
          )
        })
      )}
    </select>
  )
}
