import { useMemo, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router"
import { ChevronLeft, FileCode, FormInput } from "lucide-react"
import yaml from "js-yaml"
import { Button, Spinner, cn } from "@cozystack/ui"
import { useK8sCreate, useK8sUpdate, K8sApiError } from "@cozystack/k8s-client"
import { APPS_GROUP, APPS_VERSION } from "@cozystack/types"
import {
  useApplicationDefinition,
  appDisplayName,
  iconDataUrl,
} from "../lib/app-definitions.ts"
import { useTenantContext } from "../lib/tenant-context.tsx"
import { composeResource } from "../lib/app-resource.ts"
import { SchemaForm } from "../components/SchemaForm.tsx"
import { YamlEditor } from "../components/YamlEditor.tsx"

type Mode = "form" | "yaml"

interface ApplicationOrderPageProps {
  /** When provided, the page pre-fills the form with this spec and PUTs on save. */
  editMode?: { name: string; initialSpec: unknown }
  /** Override the AD name that would otherwise come from the URL. */
  appNameOverride?: string
}

export function ApplicationOrderPage({
  editMode,
  appNameOverride,
}: ApplicationOrderPageProps) {
  const routeParams = useParams<{ appName: string }>()
  const appName = appNameOverride ?? routeParams.appName
  const { data: ad, isLoading, error } = useApplicationDefinition(appName)
  const { tenantNamespace } = useTenantContext()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [name, setName] = useState(editMode?.name ?? searchParams.get("name") ?? "")
  const [spec, setSpec] = useState<unknown>(editMode?.initialSpec ?? {})
  const [mode, setMode] = useState<Mode>("form")
  const [yamlText, setYamlText] = useState("")
  const [yamlError, setYamlError] = useState<string | null>(null)

  const plural = ad?.spec?.application.plural ?? ""

  const create = useK8sCreate({
    apiGroup: APPS_GROUP,
    apiVersion: APPS_VERSION,
    plural,
    namespace: tenantNamespace ?? undefined,
  })
  const update = useK8sUpdate({
    apiGroup: APPS_GROUP,
    apiVersion: APPS_VERSION,
    plural,
    namespace: tenantNamespace ?? undefined,
  })

  const resource = useMemo(() => {
    if (!ad || !tenantNamespace) return null
    return composeResource(ad, tenantNamespace, name || "<name>", spec)
  }, [ad, tenantNamespace, name, spec])

  /** Switch into YAML mode: serialize current state. */
  const enterYaml = () => {
    if (resource) setYamlText(yaml.dump(resource))
    setYamlError(null)
    setMode("yaml")
  }

  /** Switch into form mode: parse YAML back to name/spec. */
  const enterForm = () => {
    try {
      const parsed = yaml.load(yamlText) as {
        metadata?: { name?: string }
        spec?: unknown
      }
      if (parsed?.metadata?.name) setName(parsed.metadata.name)
      if (parsed?.spec !== undefined) setSpec(parsed.spec)
      setYamlError(null)
      setMode("form")
    } catch (err) {
      setYamlError((err as Error).message)
    }
  }

  /** Build resource from whichever editor is currently active. */
  const snapshot = () => {
    if (mode === "yaml") {
      const parsed = yaml.load(yamlText) as {
        metadata?: { name?: string }
        spec?: unknown
      }
      return {
        name: parsed?.metadata?.name ?? name,
        spec: parsed?.spec ?? spec,
      }
    }
    return { name, spec }
  }

  const submit = async () => {
    if (!ad || !tenantNamespace) return
    const snap = snapshot()
    if (!snap.name) {
      alert("Please set a resource name.")
      return
    }
    const body = composeResource(ad, tenantNamespace, snap.name, snap.spec)
    try {
      if (editMode) {
        await update.mutateAsync(body)
      } else {
        await create.mutateAsync(body)
      }
      navigate(`/console/${plural}/${snap.name}`)
    } catch (err) {
      if (err instanceof K8sApiError) {
        alert(`Failed: ${err.message}`)
      } else {
        alert(`Failed: ${(err as Error).message}`)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-8 text-slate-500">
        <Spinner /> Loading application…
      </div>
    )
  }
  if (error || !ad) {
    return (
      <div className="p-8 text-red-600">
        Application <code>{appName}</code> not found.
      </div>
    )
  }

  const icon = iconDataUrl(ad)
  const displayName = appDisplayName(ad)
  const description = ad.spec?.dashboard?.description

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 bg-white p-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-3 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Back
        </button>
        <div className="flex items-center gap-4">
          <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
            {icon ? (
              <img src={icon} alt={displayName} className="h-full w-full" />
            ) : null}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {editMode ? `Edit ${editMode.name}` : `Deploy ${displayName}`}
            </h1>
            {description && (
              <p className="mt-0.5 text-sm text-slate-600">{description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-6 py-2">
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
              <button
                type="button"
                onClick={() => (mode === "yaml" ? enterForm() : undefined)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  mode === "form"
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50",
                )}
              >
                <FormInput className="h-3.5 w-3.5" /> Form
              </button>
              <button
                type="button"
                onClick={() => (mode === "form" ? enterYaml() : undefined)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  mode === "yaml"
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-50",
                )}
              >
                <FileCode className="h-3.5 w-3.5" /> YAML
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(-1)}
                disabled={create.isPending || update.isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={submit}
                disabled={create.isPending || update.isPending || !tenantNamespace}
              >
                {(create.isPending || update.isPending) && <Spinner className="text-white" />}
                {editMode ? "Save" : "Deploy"}
              </Button>
            </div>
          </div>

          {mode === "form" ? (
            <div className="flex-1 overflow-auto p-6">
              <div className="mx-auto max-w-3xl space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!!editMode}
                    placeholder={ad.spec?.application.singular ?? "name"}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                  />
                  {tenantNamespace && (
                    <p className="mt-1 text-xs text-slate-500">
                      Namespace: <code>{tenantNamespace}</code>
                    </p>
                  )}
                </div>
                {ad.spec?.application.openAPISchema && (
                  <SchemaForm
                    openAPISchema={ad.spec.application.openAPISchema}
                    keysOrder={ad.spec?.dashboard?.keysOrder}
                    formData={spec}
                    onChange={setSpec}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col">
              {yamlError && (
                <div className="border-b border-red-200 bg-red-50 px-6 py-2 text-xs text-red-700">
                  {yamlError}
                </div>
              )}
              <div className="flex-1">
                <YamlEditor value={yamlText} onChange={setYamlText} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
