import type {
  ObjectFieldTemplateProps,
  RJSFSchema,
  StrictRJSFSchema,
  FormContextType,
} from "@rjsf/utils"
import { KeyValueEditor } from "./KeyValueEditor.tsx"

export function CustomObjectFieldTemplate<
  T = any,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = any,
>(props: ObjectFieldTemplateProps<T, S, F>) {
  const { schema, formData, onChange, readonly, disabled } = props

  // Check if this is a free-form key-value object
  // ONLY use KeyValueEditor for truly free-form objects where both keys and values are arbitrary
  // This means x-kubernetes-preserve-unknown-fields OR additionalProperties: true (boolean, not a schema object)
  const isFreeFormObject =
    (!schema.properties || Object.keys(schema.properties).length === 0) &&
    ((schema as any)["x-kubernetes-preserve-unknown-fields"] === true ||
      schema.additionalProperties === true)

  // If it's a free-form key-value object, use our custom editor
  if (isFreeFormObject) {
    return (
      <div className="field">
        {props.title && (
          <label className="control-label">
            {props.title}
            {props.required && <span className="required">*</span>}
          </label>
        )}
        {props.description && <p className="field-description">{props.description}</p>}
        <KeyValueEditor
          value={formData || {}}
          onChange={onChange}
          readonly={readonly || disabled}
        />
      </div>
    )
  }

  // Otherwise, use default rendering
  return (
    <fieldset id={props.idSchema.$id}>
      {props.title && <legend>{props.title}</legend>}
      {props.description && <p className="field-description">{props.description}</p>}
      {props.properties.map((prop) => prop.content)}
    </fieldset>
  )
}
