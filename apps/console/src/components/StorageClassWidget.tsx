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

const DEFAULT_CLASS_ANNOTATION = "storageclass.kubernetes.io/is-default-class"

export function StorageClassWidget(props: WidgetProps) {
  const { value, onChange, required, disabled, readonly } = props

  const { data: scList, isLoading } = useK8sList<StorageClass>({
    apiGroup: "storage.k8s.io",
    apiVersion: "v1",
    plural: "storageclasses",
  })

  const storageClasses = scList?.items || []
  const currentValue = typeof value === "string" ? value : ""
  const hasCurrentInList = storageClasses.some((sc) => sc.metadata.name === currentValue)
  const defaultSC = storageClasses.find(
    (sc) => sc.metadata.annotations?.[DEFAULT_CLASS_ANNOTATION] === "true"
  )

  // Auto-select the cluster default only on initial load, not after the user
  // clears the field. Unlike "first disk", a default storage class is a real,
  // meaningful default worth pre-filling; the explicit placeholder below still
  // removes the visual lie when no default exists.
  const hasAutoDefaulted = useRef(false)
  useEffect(() => {
    if (!hasAutoDefaulted.current && !value && defaultSC && !isLoading) {
      hasAutoDefaulted.current = true
      onChange(defaultSC.metadata.name)
    }
  }, [value, defaultSC, isLoading, onChange])

  const placeholder = isLoading
    ? "Loading..."
    : storageClasses.length === 0
      ? "No storage classes available"
      : required
        ? "Select a storage class..."
        : "-- None --"

  return (
    <select
      value={currentValue}
      onChange={(e) => {
        if (!e.target.value) hasAutoDefaulted.current = false
        onChange(e.target.value || undefined)
      }}
      disabled={disabled || readonly}
      required={required}
      className="w-full rounded-lg border border-slate-300 bg-white pl-3 pr-8 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {/* Always render an explicit placeholder so a value-less required select
          shows it instead of silently displaying the first class. Disabled when
          required so the empty state can be displayed but never picked. */}
      <option value="" disabled={required}>
        {placeholder}
      </option>
      {/* Keep the committed value visible even before the list loads it, so an
          async re-render of useK8sList never drops the parent's selection. */}
      {currentValue && !hasCurrentInList && (
        <option value={currentValue}>{currentValue}</option>
      )}
      {storageClasses.map((sc) => {
        const isDefault = sc.metadata.annotations?.[DEFAULT_CLASS_ANNOTATION] === "true"
        const label = isDefault ? `${sc.metadata.name} (default)` : sc.metadata.name
        return (
          <option key={sc.metadata.name} value={sc.metadata.name}>
            {label}
          </option>
        )
      })}
    </select>
  )
}
