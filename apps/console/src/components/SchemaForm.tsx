import { useMemo } from "react"
import Form from "@rjsf/core"
import validator from "@rjsf/validator-ajv8"
import type { RJSFSchema, UiSchema, TemplatesType } from "@rjsf/utils"
import { keysOrderToUiSchema, sanitizeSchema } from "../lib/keys-order.ts"
import { customTemplates, customWidgets } from "./rjsf-templates.tsx"
import { AdditionalPropertiesField } from "./AdditionalPropertiesField.tsx"
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

    // Automatically add AdditionalPropertiesField for fields with additionalProperties schema
    return addAdditionalPropertiesWidgets(schema, withStorageClass)
  }, [keysOrder, schema])

  const customFields = useMemo(
    () => ({
      AdditionalPropertiesField: AdditionalPropertiesField,
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
