import { useEffect, useState } from "react"
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
  parameters?: Record<string, string>
}

export function StorageClassWidget(props: WidgetProps) {
  const { value, onChange, id, label, required, readonly, disabled } = props

  // Fetch StorageClasses from Kubernetes API
  const { data: storageClasses, isLoading } = useK8sList<StorageClass>({
    apiVersion: "storage.k8s.io/v1",
    kind: "StorageClass",
  })

  const classes = storageClasses?.items || []

  // Find default StorageClass
  const defaultClass = classes.find(
    (sc) => sc.metadata.annotations?.["storageclass.kubernetes.io/is-default-class"] === "true"
  )

  // Set default value if not set and default class exists
  useEffect(() => {
    if (!value && defaultClass && !readonly && !disabled) {
      onChange(defaultClass.metadata.name)
    }
  }, [value, defaultClass, readonly, disabled, onChange])

  return (
    <div className="field">
      {label && (
        <label htmlFor={id} className="control-label mb-2 block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="required ml-1 text-red-500">*</span>}
        </label>
      )}
      {isLoading ? (
        <div className="text-sm text-slate-500">Loading storage classes...</div>
      ) : (
        <select
          id={id}
          value={value || ""}
          onChange={(e) => onChange(e.target.value || undefined)}
          disabled={readonly || disabled || classes.length === 0}
          className="w-full rounded-lg border border-slate-300 bg-white pl-3 pr-8 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 disabled:bg-slate-50 disabled:text-slate-500"
        >
          <option value="">-- Select StorageClass --</option>
          {classes.map((sc) => {
            const isDefault = sc.metadata.annotations?.["storageclass.kubernetes.io/is-default-class"] === "true"
            return (
              <option key={sc.metadata.name} value={sc.metadata.name}>
                {sc.metadata.name}
                {isDefault && " (default)"}
              </option>
            )
          })}
        </select>
      )}
      {classes.length === 0 && !isLoading && (
        <p className="mt-1 text-xs text-slate-500">No StorageClasses available</p>
      )}
    </div>
  )
}
