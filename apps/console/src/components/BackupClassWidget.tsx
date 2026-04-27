import type { WidgetProps } from "@rjsf/utils"
import { useK8sList } from "@cozystack/k8s-client"

interface BackupClass {
  apiVersion: string
  kind: string
  metadata: {
    name: string
  }
}

export function BackupClassWidget(props: WidgetProps) {
  const { value, onChange, required, disabled, readonly } = props

  const { data: classList, isLoading } = useK8sList<BackupClass>({
    apiGroup: "backups.cozystack.io",
    apiVersion: "v1alpha1",
    plural: "backupclasses",
  })

  const backupClasses = classList?.items || []

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
      ) : backupClasses.length === 0 ? (
        <option value="" disabled>
          No backup classes available
        </option>
      ) : (
        backupClasses.map((bc) => (
          <option key={bc.metadata.name} value={bc.metadata.name}>
            {bc.metadata.name}
          </option>
        ))
      )}
    </select>
  )
}
