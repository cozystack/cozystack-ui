import type { WidgetProps } from "@rjsf/utils"
import { useK8sList } from "@cozystack/k8s-client"
import { Spinner } from "@cozystack/ui"

interface StorageClass {
  apiVersion: string
  kind: string
  metadata: {
    name: string
  }
}

export function StorageClassWidget(props: WidgetProps) {
  const { value, onChange, id, label, required, readonly, disabled } = props

  const { data, isLoading } = useK8sList<StorageClass>(
    {
      apiGroup: "storage.k8s.io",
      apiVersion: "v1",
      plural: "storageclasses",
    },
    { enabled: true }
  )

  const storageClasses = data?.items ?? []

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Spinner /> Loading storage classes...
      </div>
    )
  }

  return (
    <div>
      <select
        id={id}
        value={value || ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        disabled={readonly || disabled}
        className="w-full rounded-lg border border-slate-300 bg-white pl-3 pr-8 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 disabled:bg-slate-50 disabled:text-slate-500"
      >
        <option value="">-- Select Storage Class --</option>
        {storageClasses.map((sc) => (
          <option key={sc.metadata.name} value={sc.metadata.name}>
            {sc.metadata.name}
          </option>
        ))}
      </select>
    </div>
  )
}

