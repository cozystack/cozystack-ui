import type {
  IconButtonProps,
  TemplatesType,
  WidgetsType,
  FieldTemplateProps,
  FormContextType,
  RJSFSchema,
  StrictRJSFSchema,
} from "@rjsf/utils"
import { CustomObjectFieldTemplate } from "./CustomObjectFieldTemplate.tsx"
import { SourceWidget } from "./SourceWidget.tsx"
import { StorageClassWidget } from "./StorageClassWidget.tsx"
import { AdditionalPropertiesWidget } from "./AdditionalPropertiesWidget.tsx"
import { AdditionalPropertiesField } from "./AdditionalPropertiesField.tsx"

function IconButton<
  T = any,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = any,
>(props: IconButtonProps<T, S, F>) {
  const { icon, iconType, uiSchema, registry, className, ...btnProps } = props
  return (
    <button
      type="button"
      className={className}
      {...btnProps}
    >
      {icon}
    </button>
  )
}

const buttonClassName =
  "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"

const removeButtonClassName =
  "rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"

export const customTemplates: Partial<TemplatesType> = {
  ObjectFieldTemplate: CustomObjectFieldTemplate,
  ButtonTemplates: {
    AddButton: (props) => (
      <IconButton {...props} icon="+ Add" className={buttonClassName} />
    ),
    RemoveButton: (props) => (
      <IconButton {...props} icon="× Remove" className={removeButtonClassName} />
    ),
    MoveUpButton: (props) => (
      <IconButton {...props} icon="↑" className={buttonClassName} />
    ),
    MoveDownButton: (props) => (
      <IconButton {...props} icon="↓" className={buttonClassName} />
    ),
    SubmitButton: (props) => (
      <IconButton {...props} icon="Submit" className={buttonClassName} />
    ),
  },
}

export const customWidgets: Partial<WidgetsType> = {
  SourceWidget: SourceWidget,
  StorageClassWidget: StorageClassWidget,
  AdditionalPropertiesWidget: AdditionalPropertiesWidget,
}
