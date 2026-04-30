import { useMemo } from "react"
import { useK8sList } from "@cozystack/k8s-client"
import { useTenantContext } from "../lib/tenant-context.tsx"
import { useApplicationDefinitions } from "../lib/app-definitions.ts"
import { useCRDSchema } from "../lib/use-crd-schema.ts"
import { BackupResourceCreatePage } from "./BackupResourceCreatePage.tsx"
import { enrichSchemaWithEnums } from "../lib/backup-utils.ts"

interface BackupResourceCreatePageWithDataProps {
  resourceType: "plans" | "backupjobs" | "backups" | "restorejobs"
  title: string
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
  }, { enabled: !!tenantNamespace && resourceType === "backupjobs" })

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
      const kinds: string[] = appDefs?.items.map(d => d.spec?.application.kind).filter((k): k is string => Boolean(k)) ?? []
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
      const kinds: string[] = appDefs?.items.map(d => d.spec?.application.kind).filter((k): k is string => Boolean(k)) ?? []
      const strategies: string[] = [] // TODO: Get from BackupStrategy resources if needed

      if (kinds.length > 0) {
        enumMap["applicationRef.kind"] = kinds
      }
      if (strategies.length > 0) {
        enumMap["strategyRef.name"] = strategies
      }
    }

    if (resourceType === "restorejobs") {
      const backups = backupsData?.items.map((b: any) => b.metadata.name) ?? []
      const kinds: string[] = appDefs?.items.map(d => d.spec?.application.kind).filter((k): k is string => Boolean(k)) ?? []

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
