import { useMemo } from "react"
import { useK8sList } from "@cozystack/k8s-client"
import { useTenantContext } from "../lib/tenant-context.tsx"
import { useApplicationDefinitions } from "../lib/app-definitions.ts"
import { useCRDSchema } from "../lib/use-crd-schema.ts"
import { BackupResourceCreatePage } from "./BackupResourceCreatePage.tsx"

interface BackupResourceCreatePageWithDataProps {
  resourceType: "plans" | "backupjobs" | "backups" | "restorejobs"
  title: string
}

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

export function BackupResourceCreatePageWithData({
  resourceType,
  title,
}: BackupResourceCreatePageWithDataProps) {
  const { tenantNamespace } = useTenantContext()
  const { data: appDefs } = useApplicationDefinitions()

  // Map resourceType to CRD name
  const crdNameMap = {
    plans: "plans.backups.cozystack.io",
    backupjobs: "backupjobs.backups.cozystack.io",
    backups: "backups.backups.cozystack.io",
    restorejobs: "restorejobs.backups.cozystack.io",
  }

  const { schema: baseSchema, isLoading: schemaLoading } = useCRDSchema(
    crdNameMap[resourceType]
  )

  // Get Plans
  const { data: plansData } = useK8sList<any>({
    apiGroup: "backups.cozystack.io",
    apiVersion: "v1alpha1",
    plural: "plans",
    namespace: tenantNamespace ?? "",
  }, { enabled: !!tenantNamespace && (resourceType === "backupjobs" || resourceType === "restorejobs") })

  // Get Backups
  const { data: backupsData } = useK8sList<any>({
    apiGroup: "backups.cozystack.io",
    apiVersion: "v1alpha1",
    plural: "backups",
    namespace: tenantNamespace ?? "",
  }, { enabled: !!tenantNamespace && resourceType === "restorejobs" })

  // Get BackupClasses
  const { data: backupClassesData } = useK8sList<any>({
    apiGroup: "backups.cozystack.io",
    apiVersion: "v1alpha1",
    plural: "backupclasses",
  }, { enabled: resourceType === "plans" })

  const enrichedSchema = useMemo(() => {
    if (!baseSchema) return null

    const base = JSON.parse(baseSchema)
    const enumMap: Record<string, string[]> = {}

    // Add enum values based on resource type
    if (resourceType === "plans") {
      const kinds = appDefs?.items.map(d => d.spec?.application.kind).filter(Boolean) ?? []
      const backupClasses = backupClassesData?.items.map((bc: any) => bc.metadata.name) ?? []

      if (kinds.length > 0) {
        enumMap["applicationRef.kind"] = kinds
      }
      if (backupClasses.length > 0) {
        enumMap["backupClassName"] = backupClasses
      }
    }

    if (resourceType === "backupjobs") {
      const plans = plansData?.items.map((p: any) => p.metadata.name) ?? []
      if (plans.length > 0) {
        enumMap["planRef.name"] = plans
      }
    }

    if (resourceType === "backups") {
      const kinds = appDefs?.items.map(d => d.spec?.application.kind).filter(Boolean) ?? []
      const strategies = [] // TODO: Get from BackupStrategy resources if needed

      if (kinds.length > 0) {
        enumMap["applicationRef.kind"] = kinds
      }
      if (strategies.length > 0) {
        enumMap["strategyRef.name"] = strategies
      }
    }

    if (resourceType === "restorejobs") {
      const backups = backupsData?.items.map((b: any) => b.metadata.name) ?? []
      const kinds = appDefs?.items.map(d => d.spec?.application.kind).filter(Boolean) ?? []

      if (backups.length > 0) {
        enumMap["backupRef.name"] = backups
      }
      if (kinds.length > 0) {
        enumMap["targetRef.kind"] = kinds
      }
    }

    // Enrich schema with enum values
    const enriched = enrichSchemaWithEnums(base, [], enumMap)
    return JSON.stringify(enriched)
  }, [baseSchema, resourceType, appDefs, plansData, backupsData, backupClassesData])

  if (schemaLoading) {
    return (
      <div className="flex items-center gap-2 p-8 text-slate-500">
        Loading schema...
      </div>
    )
  }

  return (
    <BackupResourceCreatePage
      resourceType={resourceType}
      title={title}
      overrideSchema={enrichedSchema || undefined}
    />
  )
}
