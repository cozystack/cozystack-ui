import type {
  IconButtonProps,
  TemplatesType,
  FormContextType,
  RJSFSchema,
  StrictRJSFSchema,
  SubmitButtonProps,
} from "@rjsf/utils"
import { CustomObjectFieldTemplate } from "./CustomObjectFieldTemplate.tsx"
import { SourceWidget } from "./SourceWidget.tsx"
import { StorageClassWidget } from "./StorageClassWidget.tsx"
import { AdditionalPropertiesWidget } from "./AdditionalPropertiesWidget.tsx"
import { VMDiskWidget } from "./VMDiskWidget.tsx"
import { BackupClassWidget } from "./BackupClassWidget.tsx"

function IconButton<
  T = any,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = any,
>(props: IconButtonProps<T, S, F>) {
  const { icon, className, ...btnProps } = props
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

export const customTemplates = {
  ObjectFieldTemplate: CustomObjectFieldTemplate,
  ButtonTemplates: {
    AddButton: (props: IconButtonProps) => (
      <IconButton {...props} icon="+ Add" className={buttonClassName} />
    ),
    RemoveButton: (props: IconButtonProps) => (
      <IconButton {...props} icon="× Remove" className={removeButtonClassName} />
    ),
    CopyButton: (props: IconButtonProps) => (
      <IconButton {...props} icon="Copy" className={buttonClassName} />
    ),
    MoveUpButton: () => null,
    MoveDownButton: () => null,
    SubmitButton: (props: SubmitButtonProps) => (
      <IconButton {...props} icon="Submit" className={buttonClassName} />
    ),
  },
} as const satisfies Partial<TemplatesType>

export const customWidgets = {
  SourceWidget: SourceWidget,
  StorageClassWidget: StorageClassWidget,
  AdditionalPropertiesWidget: AdditionalPropertiesWidget,
  VMDiskWidget: VMDiskWidget,
  BackupClassWidget: BackupClassWidget,
}
