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
  const currentValue = typeof value === "string" ? value : ""
  const hasCurrentInList = backupClasses.some((bc) => bc.metadata.name === currentValue)

  return (
    <select
      value={currentValue}
      onChange={(e) => onChange(e.target.value || undefined)}
      disabled={disabled || readonly}
      required={required}
      className="w-full rounded-lg border border-slate-300 bg-white pl-3 pr-8 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {!required && <option value="">-- None --</option>}
      {/* Render the parent's value as a stable option even when the list is
          still loading or the value isn't present in the loaded results. This
          keeps the controlled <select> from losing the parent's selection on
          async re-renders of useK8sList (loading → loaded → refetch). */}
      {currentValue && !hasCurrentInList && (
        <option value={currentValue}>{currentValue}</option>
      )}
      {backupClasses.map((bc) => (
        <option key={bc.metadata.name} value={bc.metadata.name}>
          {bc.metadata.name}
        </option>
      ))}
      {!isLoading && backupClasses.length === 0 && !currentValue && (
        <option value="" disabled>
          No backup classes available
        </option>
      )}
    </select>
  )
}
