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

  const placeholder = isLoading
    ? "Loading..."
    : backupClasses.length === 0
      ? "No backup classes available"
      : required
        ? "Select a backup class..."
        : "-- None --"

  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value || undefined)}
      disabled={disabled || readonly || isLoading}
      required={required}
      className="w-full rounded-lg border border-slate-300 bg-white pl-3 pr-8 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {/* Always render an explicit placeholder so a value-less required select
          shows it instead of silently displaying the first class. Disabled when
          required so the empty state can be displayed but never picked. */}
      <option value="" disabled={required}>
        {placeholder}
      </option>
      {backupClasses.map((bc) => (
        <option key={bc.metadata.name} value={bc.metadata.name}>
          {bc.metadata.name}
        </option>
      ))}
    </select>
  )
}
