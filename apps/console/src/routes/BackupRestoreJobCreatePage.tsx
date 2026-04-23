import { useState, useMemo } from "react"
import { useNavigate } from "react-router"
import { Archive, Save } from "lucide-react"
import { Button, Section, Spinner } from "@cozystack/ui"
import { useK8sCreate, useK8sList } from "@cozystack/k8s-client"
import { useTenantContext } from "../lib/tenant-context.tsx"
import { useApplicationDefinitions } from "../lib/app-definitions.ts"
import { SchemaForm } from "../components/SchemaForm.tsx"

export function BackupRestoreJobCreatePage() {
  const navigate = useNavigate()
  const { tenantNamespace } = useTenantContext()
  const { data: appDefs } = useApplicationDefinitions()
  const [formData, setFormData] = useState<any>({})
  const [name, setName] = useState("")

  // Get Backups
  const { data: backupsData } = useK8sList<any>({
    apiGroup: "backups.cozystack.io",
    apiVersion: "v1alpha1",
    plural: "backups",
    namespace: tenantNamespace ?? "",
  }, { enabled: !!tenantNamespace })

  // Get instances for selected target kind
  const selectedKind = formData?.targetRef?.kind
  const selectedAppDef = useMemo(
    () => appDefs?.items.find(d => d.spec?.application.kind === selectedKind),
    [appDefs, selectedKind]
  )

  const { data: instancesData } = useK8sList<any>({
    apiGroup: selectedAppDef?.spec?.application.group ?? "apps.cozystack.io",
    apiVersion: selectedAppDef?.spec?.application.version ?? "v1alpha1",
    plural: selectedAppDef?.spec?.application.plural ?? "",
    namespace: tenantNamespace ?? "",
  }, { enabled: !!selectedAppDef && !!tenantNamespace })

  const createMutation = useK8sCreate({
    apiGroup: "backups.cozystack.io",
    apiVersion: "v1alpha1",
    plural: "restorejobs",
    namespace: tenantNamespace ?? "",
  })

  const schema = useMemo(() => {
    const backups = backupsData?.items.map((b: any) => b.metadata.name) ?? []
    const kinds = appDefs?.items.map(d => d.spec?.application.kind).filter(Boolean) ?? []
    const instances = instancesData?.items.map((inst: any) => inst.metadata.name) ?? []

    return JSON.stringify({
      type: "object",
      required: ["backupRef", "targetRef"],
      properties: {
        backupRef: {
          type: "object",
          title: "Backup Reference",
          description: "Reference to the backup to restore from",
          required: ["name"],
          properties: {
            name: {
              type: "string",
              title: "Backup Name",
              description: backups.length > 0 ? "Select a backup" : "No backups available - create a backup first",
              enum: backups.length > 0 ? backups : ["(no backups available)"],
            },
          },
        },
        targetRef: {
          type: "object",
          title: "Target Reference",
          description: "Reference to the application to restore to",
          required: ["kind", "name"],
          properties: {
            apiGroup: {
              type: "string",
              title: "API Group",
              default: "apps.cozystack.io",
            },
            kind: {
              type: "string",
              title: "Kind",
              description: "Type of resource",
              enum: kinds.length > 0 ? kinds : ["Postgres", "MySQL", "Redis"],
            },
            name: {
              type: "string",
              title: "Name",
              description: selectedKind
                ? instances.length > 0
                  ? "Select target instance to restore to"
                  : "No instances found for this kind"
                : "Select Kind first",
              enum: selectedKind && instances.length > 0 ? instances : selectedKind ? ["(no instances available)"] : undefined,
            },
          },
        },
      },
    })
  }, [backupsData, appDefs, instancesData, selectedKind])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      alert("Name is required")
      return
    }

    if (!formData.backupRef?.name) {
      alert("Backup reference is required")
      return
    }

    if (!formData.targetRef?.kind || !formData.targetRef?.name) {
      alert("Target reference is required")
      return
    }

    const resource = {
      apiVersion: "backups.cozystack.io/v1alpha1",
      kind: "RestoreJob",
      metadata: {
        name: name.trim(),
        namespace: tenantNamespace,
      },
      spec: formData,
    }

    try {
      await createMutation.mutateAsync(resource)
      navigate("/console/backups/restorejobs")
    } catch (err) {
      alert(`Failed to create RestoreJob: ${(err as Error).message}`)
    }
  }

  const handleCancel = () => {
    navigate("/console/backups/restorejobs")
  }

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-slate-100">
          <Archive className="size-6 text-slate-600" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Create Restore Job</h1>
          <p className="text-xs text-slate-500">
            Restore a backup to an application instance
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Section>
          <div className="space-y-4 p-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Restore Job Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-restore-job"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                required
              />
            </div>

            <div>
              <SchemaForm
                openAPISchema={schema}
                formData={formData}
                onChange={setFormData}
              >
                <div className="hidden" />
              </SchemaForm>
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-slate-200 px-5 py-3">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Spinner /> Creating...
                </>
              ) : (
                <>
                  <Save className="size-3.5" /> Create
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </Section>
      </form>
    </div>
  )
}
