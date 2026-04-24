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

  // Check if this is an addon object (has 'enabled' field and other config fields)
  const hasEnabledField = props.properties.some((p) => p.name === "enabled")
  const hasOtherFields = props.properties.some((p) => p.name !== "enabled")
  const isAddon = hasEnabledField && hasOtherFields

  // If this is an addon, use conditional rendering based on 'enabled' state
  if (isAddon) {
    const isEnabled = formData?.enabled === true
    const enabledProp = props.properties.find((p) => p.name === "enabled")
    const otherProps = props.properties.filter((p) => p.name !== "enabled")

    return (
      <fieldset id={props.idSchema.$id} className="border border-slate-200 rounded-lg p-4 mb-3">
        {props.title && (
          <legend className="text-sm font-medium text-slate-900 px-2">{props.title}</legend>
        )}
        {props.description && <p className="field-description text-xs text-slate-500 mb-3">{props.description}</p>}

        {/* Always show the 'enabled' checkbox */}
        {enabledProp && (
          <div className="mb-3">
            {enabledProp.content}
          </div>
        )}

        {/* Show other fields only if enabled */}
        {isEnabled && otherProps.length > 0 && (
          <div className="space-y-3 pl-6 border-l-2 border-blue-200">
            {otherProps.map((prop) => (
              <div key={prop.name}>{prop.content}</div>
            ))}
          </div>
        )}

        {!isEnabled && otherProps.length > 0 && (
          <p className="text-xs text-slate-400 italic mt-2">
            Enable this addon to configure additional settings
          </p>
        )}
      </fieldset>
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
