import { useState, useMemo } from "react"
import { useNavigate } from "react-router"
import { Archive, Save } from "lucide-react"
import { Button, Section, Spinner } from "@cozystack/ui"
import { useK8sCreate, useK8sList } from "@cozystack/k8s-client"
import { useTenantContext } from "../lib/tenant-context.tsx"
import { useApplicationDefinitions } from "../lib/app-definitions.ts"
import { useCRDSchema } from "../lib/use-crd-schema.ts"
import { SchemaForm } from "../components/SchemaForm.tsx"

/**
 * Recursively adds enum values to schema properties
 */
function enrichSchemaWithEnums(
  schema: any,
  path: string[],
  enumMap: Record<string, string[]>
): any {
  if (!schema || typeof schema !== "object") return schema

  const currentPath = path.join(".")
  const result = { ...schema }

  // Add enum if this path has enum values
  if (enumMap[currentPath]) {
    result.enum = enumMap[currentPath]
  }

  // Recurse into properties
  if (result.properties) {
    result.properties = Object.fromEntries(
      Object.entries(result.properties).map(([key, value]) => [
        key,
        enrichSchemaWithEnums(value, [...path, key], enumMap),
      ])
    )
  }

  return result
}

export function BackupPlanCreatePage() {
  const navigate = useNavigate()
  const { tenantNamespace } = useTenantContext()
  const { data: appDefs } = useApplicationDefinitions()
  const [formData, setFormData] = useState<any>({})
  const [name, setName] = useState("")

  // Get base schema from CRD
  const { schema: baseSchema, isLoading: schemaLoading } = useCRDSchema(
    "plans.backups.cozystack.io"
  )

  // Get BackupClasses
  const { data: backupClassesData } = useK8sList<any>({
    apiGroup: "backups.cozystack.io",
    apiVersion: "v1alpha1",
    plural: "backupclasses",
  })

  // Get instances for selected kind
  const selectedKind = formData?.applicationRef?.kind
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
    plural: "plans",
    namespace: tenantNamespace ?? "",
  })

  const schema = useMemo(() => {
    if (!baseSchema) return null

    const base = JSON.parse(baseSchema)
    const kinds = appDefs?.items.map(d => d.spec?.application.kind).filter(Boolean) ?? []
    const backupClasses = backupClassesData?.items.map((bc: any) => bc.metadata.name) ?? []
    const instances = instancesData?.items.map((inst: any) => inst.metadata.name) ?? []

    const enumMap: Record<string, string[]> = {}

    // Add enum values for dropdowns
    if (kinds.length > 0) {
      enumMap["applicationRef.kind"] = kinds
    }
    if (selectedKind && instances.length > 0) {
      enumMap["applicationRef.name"] = instances
    }
    if (backupClasses.length > 0) {
      enumMap["backupClassName"] = backupClasses
    }

    // Enrich schema with enum values
    const enriched = enrichSchemaWithEnums(base, [], enumMap)
    return JSON.stringify(enriched)
  }, [baseSchema, appDefs, backupClassesData, instancesData, selectedKind])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      alert("Name is required")
      return
    }

    if (!formData.applicationRef?.kind || !formData.applicationRef?.name) {
      alert("Application reference is required")
      return
    }

    if (!formData.backupClassName) {
      alert("Backup class name is required")
      return
    }

    const resource = {
      apiVersion: "backups.cozystack.io/v1alpha1",
      kind: "Plan",
      metadata: {
        name: name.trim(),
        namespace: tenantNamespace,
      },
      spec: formData,
    }

    try {
      await createMutation.mutateAsync(resource)
      navigate("/console/backups/plans")
    } catch (err) {
      alert(`Failed to create Plan: ${(err as Error).message}`)
    }
  }

  const handleCancel = () => {
    navigate("/console/backups/plans")
  }

  if (schemaLoading) {
    return (
      <div className="flex items-center gap-2 p-8 text-slate-500">
        <Spinner /> Loading schema...
      </div>
    )
  }

  if (!schema) {
    return (
      <div className="p-8 text-red-600">
        Failed to load Plan schema. Please refresh the page.
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
          <h1 className="text-lg font-semibold text-slate-900">Create Plan</h1>
          <p className="text-xs text-slate-500">
            Configure a backup plan for your application
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Section>
          <div className="space-y-4 p-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Plan Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-backup-plan"
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
