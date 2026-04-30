import { useEffect, useRef } from "react"
import type { WidgetProps } from "@rjsf/utils"
import { useK8sList } from "@cozystack/k8s-client"

interface StorageClass {
  apiVersion: string
  kind: string
  metadata: {
    name: string
    annotations?: Record<string, string>
  }
  provisioner: string
}

export function StorageClassWidget(props: WidgetProps) {
  const { value, onChange, required, disabled, readonly } = props

  const { data: scList, isLoading } = useK8sList<StorageClass>({
    apiGroup: "storage.k8s.io",
    apiVersion: "v1",
    plural: "storageclasses",
  })

  const storageClasses = scList?.items || []
  const defaultSC = storageClasses.find(
    (sc) => sc.metadata.annotations?.["storageclass.kubernetes.io/is-default-class"] === "true"
  )

  // Auto-select default storage class only on initial load, not after user clears the field
  const hasAutoDefaulted = useRef(false)
  useEffect(() => {
    if (!hasAutoDefaulted.current && !value && defaultSC && !isLoading) {
      hasAutoDefaulted.current = true
      onChange(defaultSC.metadata.name)
    }
  }, [value, defaultSC, isLoading, onChange])

  return (
    <select
      value={value || ""}
      onChange={(e) => {
        if (!e.target.value) hasAutoDefaulted.current = false
        onChange(e.target.value || undefined)
      }}
      disabled={disabled || readonly || isLoading}
      required={required}
      className="w-full rounded-lg border border-slate-300 bg-white pl-3 pr-8 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {!required && <option value="">-- None --</option>}
      {isLoading ? (
        <option value="">Loading...</option>
      ) : storageClasses.length === 0 ? (
        <option value="" disabled>
          No storage classes available
        </option>
      ) : (
        storageClasses.map((sc) => {
          const isDefault =
            sc.metadata.annotations?.["storageclass.kubernetes.io/is-default-class"] === "true"
          const label = isDefault ? `${sc.metadata.name} (default)` : sc.metadata.name
          return (
            <option key={sc.metadata.name} value={sc.metadata.name}>
              {label}
            </option>
          )
        })
      )}
    </select>
  )
}
