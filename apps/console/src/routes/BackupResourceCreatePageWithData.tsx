import { useMemo, useState, useEffect } from "react"
import { useK8sList } from "@cozystack/k8s-client"
import { useTenantContext } from "../lib/tenant-context.tsx"
import { useApplicationDefinitions } from "../lib/app-definitions.ts"
import { BackupResourceCreatePage } from "./BackupResourceCreatePage.tsx"

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

  const schema = useMemo(() => {
    if (resourceType === "plans") {
      const kinds = appDefs?.items.map(d => d.spec?.application.kind).filter(Boolean) ?? []
      const backupClasses = backupClassesData?.items.map((bc: any) => bc.metadata.name) ?? []

      return JSON.stringify({
        type: "object",
        required: ["applicationRef", "backupClassName", "schedule"],
        properties: {
          applicationRef: {
            type: "object",
            title: "Application Reference",
            description: "Reference to the application to backup",
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
                description: "Name of the resource instance",
              },
            },
          },
          backupClassName: {
            type: "string",
            title: "Backup Class Name",
            description: "Name of the BackupClass to use",
            enum: backupClasses.length > 0 ? backupClasses : ["default"],
          },
          schedule: {
            type: "object",
            title: "Schedule",
            description: "Backup schedule configuration",
            properties: {
              type: {
                type: "string",
                title: "Type",
                default: "cron",
                enum: ["cron"],
              },
              cron: {
                type: "string",
                title: "Cron Expression",
                description: "Cron schedule (e.g., '0 2 * * *' for daily at 2am)",
                default: "0 2 * * *",
              },
            },
          },
        },
      })
    }

    if (resourceType === "backupjobs") {
      const plans = plansData?.items.map((p: any) => p.metadata.name) ?? []

      return JSON.stringify({
        type: "object",
        required: ["planRef"],
        properties: {
          planRef: {
            type: "object",
            title: "Plan Reference",
            description: "Reference to the backup plan",
            required: ["name"],
            properties: {
              name: {
                type: "string",
                title: "Plan Name",
                description: plans.length > 0 ? "Select a plan" : "No plans available - create a plan first",
                enum: plans.length > 0 ? plans : ["(no plans available)"],
              },
            },
          },
        },
      })
    }

    if (resourceType === "backups") {
      const plans = plansData?.items.map((p: any) => p.metadata.name) ?? []

      return JSON.stringify({
        type: "object",
        required: ["planRef"],
        properties: {
          planRef: {
            type: "object",
            title: "Plan Reference",
            description: "Reference to the backup plan",
            required: ["name"],
            properties: {
              name: {
                type: "string",
                title: "Plan Name",
                description: plans.length > 0 ? "Select a plan" : "No plans available - create a plan first",
                enum: plans.length > 0 ? plans : ["(no plans available)"],
              },
            },
          },
        },
      })
    }

    if (resourceType === "restorejobs") {
      const backups = backupsData?.items.map((b: any) => b.metadata.name) ?? []
      const kinds = appDefs?.items.map(d => d.spec?.application.kind).filter(Boolean) ?? []

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
                description: "Name of the resource instance",
              },
            },
          },
        },
      })
    }

    return "{}"
  }, [resourceType, appDefs, plansData, backupsData, backupClassesData])

  return (
    <BackupResourceCreatePage
      resourceType={resourceType}
      title={title}
      schema={schema}
    />
  )
}
