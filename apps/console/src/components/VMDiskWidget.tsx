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

  // Auto-select the first disk once when disks become available and no value is set.
  // A ref prevents re-triggering on every k8s watch event (new array reference)
  // while still firing correctly when the list loads after mount.
  const autoSelectedRef = useRef(false)
  useEffect(() => {
    if (autoSelectedRef.current) return
    if (required && !value && disks.length > 0 && !isLoading) {
      autoSelectedRef.current = true
      onChangeRef.current(disks[0].metadata.name)
    }
  }, [required, value, disks, isLoading])

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
