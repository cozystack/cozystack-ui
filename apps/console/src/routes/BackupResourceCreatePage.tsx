import { useState } from "react"
import { useNavigate } from "react-router"
import { Archive, Save } from "lucide-react"
import { Button, Section, Spinner } from "@cozystack/ui"
import { useK8sCreate } from "@cozystack/k8s-client"
import { useTenantContext } from "../lib/tenant-context.tsx"
import { useCRDSchema } from "../lib/use-crd-schema.ts"
import { SchemaForm } from "../components/SchemaForm.tsx"

interface BackupResourceCreatePageProps {
  resourceType: "plans" | "backupjobs" | "backups" | "restorejobs"
  title: string
  overrideSchema?: string // Optional schema override (e.g., with enum values)
}

export function BackupResourceCreatePage({
  resourceType,
  title,
  overrideSchema,
}: BackupResourceCreatePageProps) {
  const navigate = useNavigate()
  const { tenantNamespace } = useTenantContext()
  const [formData, setFormData] = useState<any>({})
  const [name, setName] = useState("")

  // Map resourceType to CRD name
  const crdNameMap = {
    plans: "plans.backups.cozystack.io",
    backupjobs: "backupjobs.backups.cozystack.io",
    backups: "backups.backups.cozystack.io",
    restorejobs: "restorejobs.backups.cozystack.io",
  }

  const { schema: crdSchema, isLoading: schemaLoading } = useCRDSchema(crdNameMap[resourceType])

  // Use override schema if provided, otherwise use CRD schema
  const schema = overrideSchema || crdSchema

  const createMutation = useK8sCreate({
    apiGroup: "backups.cozystack.io",
    apiVersion: "v1alpha1",
    plural: resourceType,
    namespace: tenantNamespace ?? "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      alert("Name is required")
      return
    }

    const kindMap: Record<BackupResourceCreatePageProps["resourceType"], string> = {
      plans: "Plan",
      backupjobs: "BackupJob",
      backups: "Backup",
      restorejobs: "RestoreJob",
    }

    const resource = {
      apiVersion: "backups.cozystack.io/v1alpha1",
      kind: kindMap[resourceType],
      metadata: {
        name: name.trim(),
        namespace: tenantNamespace ?? undefined,
      },
      spec: formData,
    }

    try {
      await createMutation.mutateAsync(resource)
      navigate(`/console/backups/${resourceType}`)
    } catch (err) {
      alert(`Failed to create ${title}: ${(err as Error).message}`)
    }
  }

  const handleCancel = () => {
    navigate(`/console/backups/${resourceType}`)
  }

  if (schemaLoading) {
    return (
      <div className="flex items-center gap-2 p-8 text-slate-500">
        <Spinner /> Loading schema...
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-slate-100">
          <Archive className="size-6 text-slate-600" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Create {title.slice(0, -1)}
          </h1>
          <p className="text-xs text-slate-500">
            Fill in the details to create a new {title.toLowerCase().slice(0, -1)}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Section>
          <div className="space-y-4 p-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-resource-name"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                required
              />
            </div>

            {schema && (
              <div>
                <SchemaForm
                  openAPISchema={schema}
                  formData={formData}
                  onChange={setFormData}
                >
                  <div className="hidden" />
                </SchemaForm>
              </div>
            )}
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
