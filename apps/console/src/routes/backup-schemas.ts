// Simplified OpenAPI schemas for backup resources
// These are based on the CRD definitions from backups.cozystack.io/v1alpha1

export const planSchema = JSON.stringify({
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
          description: "Type of resource (e.g., Postgres, MySQL)",
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

export const backupJobSchema = JSON.stringify({
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
          description: "Name of the Plan resource",
        },
      },
    },
  },
})

export const backupSchema = JSON.stringify({
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
          description: "Name of the Plan resource",
        },
      },
    },
  },
})

export const restoreJobSchema = JSON.stringify({
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
          description: "Name of the Backup resource",
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
          description: "Type of resource (e.g., Postgres, MySQL)",
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
