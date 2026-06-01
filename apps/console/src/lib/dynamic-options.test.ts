import { describe, it, expect } from "vitest"
import type { RJSFSchema } from "@rjsf/utils"
import { addDynamicOptionWidgets } from "./dynamic-options.ts"

describe("addDynamicOptionWidgets", () => {
  it("binds a top-level field carrying x-cozystack-options to the widget", () => {
    const schema: RJSFSchema = {
      type: "object",
      properties: {
        backupClassName: {
          type: "string",
          "x-cozystack-options": { source: "backupclass" },
        } as RJSFSchema,
        unrelated: { type: "string" },
      },
    }

    const ui = addDynamicOptionWidgets(schema)

    expect(ui.backupClassName?.["ui:widget"]).toBe("DynamicOptionsWidget")
    expect(ui.unrelated).toBeUndefined()
  })

  it("recurses into nested object properties (applicationRef.kind)", () => {
    // Mirrors the backup CRD shape: applicationRef.kind -> appkind source,
    // applicationRef.name left as plain string (served by client enumMap).
    const schema: RJSFSchema = {
      type: "object",
      properties: {
        applicationRef: {
          type: "object",
          properties: {
            kind: {
              type: "string",
              "x-cozystack-options": { source: "appkind" },
            } as RJSFSchema,
            name: { type: "string" },
          },
        },
        backupClassName: {
          type: "string",
          "x-cozystack-options": { source: "backupclass" },
        } as RJSFSchema,
      },
    }

    const ui = addDynamicOptionWidgets(schema)

    expect(ui.applicationRef?.kind?.["ui:widget"]).toBe("DynamicOptionsWidget")
    expect(ui.applicationRef?.name?.["ui:widget"]).toBeUndefined()
    expect(ui.backupClassName?.["ui:widget"]).toBe("DynamicOptionsWidget")
  })

  it("recurses into a nested reference object (planRef.name)", () => {
    const schema: RJSFSchema = {
      type: "object",
      properties: {
        planRef: {
          type: "object",
          properties: {
            name: {
              type: "string",
              "x-cozystack-options": { source: "plan" },
            } as RJSFSchema,
          },
        },
      },
    }

    const ui = addDynamicOptionWidgets(schema)

    expect(ui.planRef?.name?.["ui:widget"]).toBe("DynamicOptionsWidget")
  })

  it("preserves an existing uiSchema while adding widgets", () => {
    const schema: RJSFSchema = {
      type: "object",
      properties: {
        backupClassName: {
          type: "string",
          "x-cozystack-options": { source: "backupclass" },
        } as RJSFSchema,
      },
    }

    const ui = addDynamicOptionWidgets(schema, {
      backupClassName: { "ui:title": "Backup Class" },
    })

    expect(ui.backupClassName?.["ui:widget"]).toBe("DynamicOptionsWidget")
    expect(ui.backupClassName?.["ui:title"]).toBe("Backup Class")
  })
})
