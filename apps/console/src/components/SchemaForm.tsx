import { useMemo, useEffect, useRef } from "react"
import Form from "@rjsf/core"
import validator from "@rjsf/validator-ajv8"
import { getDefaultFormState } from "@rjsf/utils"
import type { RJSFSchema, UiSchema, TemplatesType } from "@rjsf/utils"
import { keysOrderToUiSchema, sanitizeSchema } from "../lib/keys-order.ts"
import { customTemplates, customWidgets } from "./rjsf-templates.tsx"
import { AdditionalPropertiesField } from "./AdditionalPropertiesField.tsx"
import { ResourceQuotasField } from "./ResourceQuotasField.tsx"
import { SourceField } from "./SourceField.tsx"
import "./schema-form.css"

/**
 * Recursively find all storageClass fields in schema and add widget to uiSchema
 */
function addStorageClassWidgets(schema: RJSFSchema, uiSchema: UiSchema = {}): UiSchema {
  if (!schema || typeof schema !== "object") return uiSchema

  const properties = (schema as any).properties
  if (!properties || typeof properties !== "object") return uiSchema

  const result = { ...uiSchema }

  for (const [key, value] of Object.entries(properties)) {
    if (key === "storageClass" && typeof value === "object" && (value as any).type === "string") {
      // Found a storageClass field - add widget
      result[key] = {
        ...result[key],
        "ui:widget": "StorageClassWidget",
      }
    } else if (typeof value === "object" && (value as any).properties) {
      // Recursively process nested objects
      result[key] = addStorageClassWidgets(value as RJSFSchema, result[key] as UiSchema)
    }
  }

  return result
}

/**
 * Recursively find all backupClassName fields in schema and add widget to uiSchema
 */
function addBackupClassWidgets(schema: RJSFSchema, uiSchema: UiSchema = {}): UiSchema {
  if (!schema || typeof schema !== "object") return uiSchema

  const properties = (schema as any).properties
  if (!properties || typeof properties !== "object") return uiSchema

  const result = { ...uiSchema }

  for (const [key, value] of Object.entries(properties)) {
    if (key === "backupClassName" && typeof value === "object" && (value as any).type === "string") {
      // Found a backupClassName field - add widget
      result[key] = {
        ...result[key],
        "ui:widget": "BackupClassWidget",
      }
    } else if (typeof value === "object" && (value as any).properties) {
      // Recursively process nested objects
      result[key] = addBackupClassWidgets(value as RJSFSchema, result[key] as UiSchema)
    }
  }

  return result
}

/**
 * Recursively find all fields with additionalProperties schema and add widget
 */
function addAdditionalPropertiesWidgets(schema: RJSFSchema, uiSchema: UiSchema = {}): UiSchema {
  if (!schema || typeof schema !== "object") return uiSchema

  const properties = (schema as any).properties
  if (!properties || typeof properties !== "object") return uiSchema

  const result = { ...uiSchema }

  for (const [key, value] of Object.entries(properties)) {
    if (typeof value === "object" && value !== null) {
      const fieldSchema = value as any
      // Check if this field has additionalProperties with a schema
      const hasAdditionalPropertiesSchema =
        fieldSchema.type === "object" &&
        (!fieldSchema.properties || Object.keys(fieldSchema.properties).length === 0) &&
        typeof fieldSchema.additionalProperties === "object" &&
        fieldSchema.additionalProperties !== null &&
        fieldSchema.additionalProperties !== true

      if (hasAdditionalPropertiesSchema) {
        // Found a field with additionalProperties schema - use custom field
        result[key] = {
          ...result[key],
          "ui:field": "AdditionalPropertiesField",
        }
      } else if (fieldSchema.properties) {
        // Recursively process nested objects
        result[key] = addAdditionalPropertiesWidgets(fieldSchema, result[key] as UiSchema)
      }
    }
  }

  return result
}

/**
 * Add VMDiskWidget to the "name" field inside "disks" array items
 */
function addVMDiskWidgets(schema: RJSFSchema, uiSchema: UiSchema = {}): UiSchema {
  if (!schema || typeof schema !== "object") return uiSchema

  const properties = (schema as any).properties
  if (!properties || typeof properties !== "object") return uiSchema

  const result = { ...uiSchema }

  for (const [key, value] of Object.entries(properties)) {
    if (key === "disks" && typeof value === "object" && value !== null) {
      const fieldSchema = value as any
      // Check if this is an array of objects with a "name" property
      if (
        fieldSchema.type === "array" &&
        fieldSchema.items?.type === "object" &&
        fieldSchema.items?.properties?.name
      ) {
        // Add VMDiskWidget to the "name" field inside array items
        result[key] = {
          ...result[key],
          items: {
            ...(result[key] as any)?.items,
            name: {
              ...((result[key] as any)?.items?.name || {}),
              "ui:widget": "VMDiskWidget",
            },
          },
        }
      }
    } else if (typeof value === "object" && (value as any).properties) {
      // Recursively process nested objects
      result[key] = addVMDiskWidgets(value as RJSFSchema, result[key] as UiSchema)
    }
  }

  return result
}

interface SchemaFormProps {
  openAPISchema: string
  keysOrder?: string[][]
  formData: unknown
  onChange: (data: unknown) => void
  children?: React.ReactNode
}

export function SchemaForm({
  openAPISchema,
  keysOrder,
  formData,
  onChange,
  children,
}: SchemaFormProps) {
  const schema = useMemo<RJSFSchema>(() => {
    try {
      return sanitizeSchema(JSON.parse(openAPISchema)) as RJSFSchema
    } catch {
      return {} as RJSFSchema
    }
  }, [openAPISchema])

  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const initialFormDataRef = useRef(formData)
  const emittedSchemaRef = useRef<RJSFSchema | null>(null)

  // Emit defaults to parent once per schema so spec is never empty on first submit.
  // Uses initialFormDataRef so edit-mode existing values are preserved as base.
  // emittedSchemaRef prevents re-running on unrelated re-renders and avoids
  // overwriting user data if the schema object changes identity unexpectedly.
  useEffect(() => {
    if (!schema || Object.keys(schema).length === 0) return
    if (emittedSchemaRef.current === schema) return
    emittedSchemaRef.current = schema
    const defaults = getDefaultFormState(validator, schema, initialFormDataRef.current ?? {}, schema)
    onChangeRef.current(defaults)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema])

  const uiSchema = useMemo<UiSchema>(() => {
    const baseUiSchema: UiSchema = {
      "ui:submitButtonOptions": { norender: true },
      ...keysOrderToUiSchema(keysOrder),
      // Use SourceField for mutually exclusive source fields
      source: {
        "ui:field": "SourceField",
      },
    }

    // Automatically add StorageClassWidget for all storageClass fields
    const withStorageClass = addStorageClassWidgets(schema, baseUiSchema)

    // Automatically add BackupClassWidget for all backupClassName fields
    const withBackupClass = addBackupClassWidgets(schema, withStorageClass)

    // Automatically add VMDiskWidget for disks[].name field
    const withVMDisk = addVMDiskWidgets(schema, withBackupClass)

    // Automatically add AdditionalPropertiesField for fields with additionalProperties schema
    const withAdditionalProps = addAdditionalPropertiesWidgets(schema, withVMDisk)

    // Override resourceQuotas field with structured quota editor.
    // Scoped to schemas where resourceQuotas has additionalProperties: {type: "string"}
    // (the cozystack-tenants chart shape) to avoid activating on unrelated CRDs.
    const rqSchema = (schema as any).properties?.resourceQuotas
    if (rqSchema && rqSchema.additionalProperties?.type === "string") {
      withAdditionalProps.resourceQuotas = {
        ...withAdditionalProps.resourceQuotas,
        "ui:field": "ResourceQuotasField",
      }
    }

    return withAdditionalProps
  }, [keysOrder, schema])

  const customFields = useMemo(
    () => ({
      AdditionalPropertiesField: AdditionalPropertiesField,
      ResourceQuotasField: ResourceQuotasField,
      SourceField: SourceField,
    }),
    []
  )

  // Create templates without submit button
  const templatesWithoutSubmit = useMemo<Partial<TemplatesType>>(() => {
    return {
      ...customTemplates,
      ButtonTemplates: {
        ...customTemplates.ButtonTemplates,
        SubmitButton: () => null,
      },
    }
  }, [])

  return (
    <div className="rjsf-container">
      <Form
        tagName="div"
        schema={schema}
        uiSchema={uiSchema}
        formData={formData}
        validator={validator}
        templates={templatesWithoutSubmit}
        widgets={customWidgets}
        fields={customFields}
        onChange={(e) => onChange(e.formData)}
        liveValidate={false}
        showErrorList={false}
      >
        {children}
      </Form>
    </div>
  )
}
