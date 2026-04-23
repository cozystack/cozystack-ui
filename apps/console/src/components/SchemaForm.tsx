import { useMemo } from "react"
import Form from "@rjsf/core"
import validator from "@rjsf/validator-ajv8"
import type { RJSFSchema, UiSchema } from "@rjsf/utils"
import { keysOrderToUiSchema, sanitizeSchema } from "../lib/keys-order.ts"
import { customTemplates, customWidgets } from "./rjsf-templates.tsx"
import "./schema-form.css"

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

  const uiSchema = useMemo<UiSchema>(
    () => ({
      "ui:submitButtonOptions": { norender: true },
      ...keysOrderToUiSchema(keysOrder),
      // Use SourceWidget for mutually exclusive source fields
      source: {
        "ui:widget": "SourceWidget",
      },
    }),
    [keysOrder],
  )

  return (
    <div className="rjsf-container">
      <Form
        schema={schema}
        uiSchema={uiSchema}
        formData={formData}
        validator={validator}
        templates={customTemplates}
        widgets={customWidgets}
        onChange={(e) => onChange(e.formData)}
        liveValidate={false}
        showErrorList={false}
      >
        {children}
      </Form>
    </div>
  )
}
