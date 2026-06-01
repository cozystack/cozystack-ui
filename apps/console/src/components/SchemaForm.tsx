import { useMemo, useEffect, useRef } from "react"
import Form from "@rjsf/core"
import validator from "@rjsf/validator-ajv8"
import { getDefaultFormState } from "@rjsf/utils"
import type { RJSFSchema, UiSchema, TemplatesType } from "@rjsf/utils"
import { useK8sList } from "@cozystack/k8s-client"
import { APPS_GROUP, APPS_VERSION } from "@cozystack/types"
import { keysOrderToUiSchema, sanitizeSchema } from "../lib/keys-order.ts"
import { addSensitiveStringWidgets } from "../lib/sensitive-fields.ts"
import {
  IMMUTABLE_HELP_TEXT,
  findImmutablePaths,
  type ImmutablePath,
} from "../lib/immutable-paths.ts"
import { customTemplates, customWidgets } from "./rjsf-templates.tsx"
import { AdditionalPropertiesField } from "./AdditionalPropertiesField.tsx"
import { ResourceQuotasField } from "./ResourceQuotasField.tsx"
import { SourceField } from "./SourceField.tsx"
import { useOptionalTenantContext } from "../lib/tenant-context.tsx"
import "./schema-form.css"

interface VMDiskRef {
  apiVersion: string
  kind: string
  metadata: { name: string; namespace: string }
  spec: { storage: string; storageClass?: string }
}

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
      // Skip attaching the custom widget when an explicit enum is already
      // present — the parent supplies the option list, RJSF's native
      // SelectWidget handles binding correctly. Auto-attaching here would
      // override the select with our BackupClassWidget whose internal
      // useK8sList state can drop the user's selection on async re-renders.
      if (Array.isArray((value as any).enum)) {
        continue
      }
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

// Adds an `enum` (and a matching `default` when the field is required) to
// `disks[].name` so RJSF's getDefaultFormState seeds the first disk name on
// "+ add". Without the default, an item gets created without `name` and a
// quick Form → YAML toggle serializes it as `{}` or drops it entirely.
function injectDiskEnum(schema: RJSFSchema, diskNames: readonly string[]): RJSFSchema {
  if (!schema || typeof schema !== "object" || diskNames.length === 0) return schema

  const visit = (node: any): any => {
    if (!node || typeof node !== "object") return node
    const props = node.properties
    if (!props || typeof props !== "object") return node
    const nextProps: Record<string, any> = { ...props }
    let changed = false
    for (const [key, value] of Object.entries(props)) {
      if (
        key === "disks" &&
        value &&
        typeof value === "object" &&
        (value as any).type === "array" &&
        (value as any).items?.type === "object" &&
        (value as any).items?.properties?.name?.type === "string"
      ) {
        const disksField = value as any
        const itemRequired: string[] = Array.isArray(disksField.items.required)
          ? disksField.items.required
          : []
        const nameRequired = itemRequired.includes("name")
        nextProps[key] = {
          ...disksField,
          items: {
            ...disksField.items,
            properties: {
              ...disksField.items.properties,
              name: {
                ...disksField.items.properties.name,
                enum: [...diskNames],
                ...(nameRequired ? { default: diskNames[0] } : {}),
              },
            },
          },
        }
        changed = true
        continue
      }
      const visited = visit(value)
      if (visited !== value) {
        nextProps[key] = visited
        changed = true
      }
    }
    return changed ? { ...node, properties: nextProps } : node
  }

  return visit(schema) as RJSFSchema
}

function schemaHasDiskField(schema: unknown): boolean {
  if (!schema || typeof schema !== "object") return false
  const props = (schema as any).properties
  if (!props || typeof props !== "object") return false
  for (const [key, value] of Object.entries(props)) {
    if (
      key === "disks" &&
      value &&
      typeof value === "object" &&
      (value as any).type === "array" &&
      (value as any).items?.type === "object" &&
      (value as any).items?.properties?.name?.type === "string"
    ) {
      return true
    }
    if (value && typeof value === "object" && (value as any).properties) {
      if (schemaHasDiskField(value)) return true
    }
  }
  return false
}

/**
 * Apply ui:disabled + ui:help to every path the schema declares immutable.
 * The disabled flag (not readonly) gives the grey-out treatment specified
 * by product. Wildcard "*" segments translate to "items" for arrays. For
 * object maps (additionalProperties) the disabled flag is set on the
 * field itself so AdditionalPropertiesField hides Add/Remove controls and
 * disables the nested forms — see the comment at the additionalProperties
 * branch below for the UX trade-off.
 *
 * NOTE: this walker navigates the sanitised schema (which still carries
 * `properties`, `items` and `additionalProperties` structurally). The
 * immutable-path *set* is harvested separately from the *raw* schema via
 * findImmutablePaths, since sanitizeSchema strips x-kubernetes-validations
 * on its way to AJV. If a future sanitisation step ever rewrites those
 * structural keys, this walker needs to be updated in lockstep.
 */
function addImmutableReadonly(
  schema: RJSFSchema,
  uiSchema: UiSchema,
  paths: readonly ImmutablePath[],
): UiSchema {
  if (paths.length === 0) return uiSchema
  const next: UiSchema = { ...uiSchema }
  for (const path of paths) {
    applyImmutablePath(schema, next, path, 0)
  }
  return next
}

function applyImmutablePath(
  schemaNode: unknown,
  uiNode: Record<string, unknown>,
  path: ImmutablePath,
  depth: number,
): void {
  if (depth === path.length) {
    uiNode["ui:disabled"] = true
    uiNode["ui:help"] = IMMUTABLE_HELP_TEXT
    return
  }
  const seg = path[depth]
  const schemaObj =
    schemaNode && typeof schemaNode === "object" && !Array.isArray(schemaNode)
      ? (schemaNode as Record<string, unknown>)
      : null
  if (seg === "*") {
    if (schemaObj && schemaObj.items) {
      const isLast = depth === path.length - 1
      if (isLast) {
        // Whole-array immutable: mark the wrapper itself disabled so
        // RJSF's ArrayFieldTemplate hides Add/Remove and disables every
        // element. Mirrors the additionalProperties-map handling below;
        // without this the user could click Add, fill an entry, and
        // watch it silently disappear on save when overlay clones source.
        uiNode["ui:disabled"] = true
        uiNode["ui:help"] = IMMUTABLE_HELP_TEXT
        return
      }
      const childUi = ensureChild(uiNode, "items")
      applyImmutablePath(schemaObj.items, childUi, path, depth + 1)
      return
    }
    // additionalProperties object map. Per-value immutability is rendered
    // here as whole-map immutability: the field itself is marked disabled,
    // AdditionalPropertiesField hides Add/Remove and disables every inner
    // input. Splitting "keys editable, values frozen" needs custom plumbing
    // through that field plus a UX decision on whether deleting an entry
    // counts as mutating its value — deliberately deferred until a real
    // schema asks for it.
    uiNode["ui:disabled"] = true
    uiNode["ui:help"] = IMMUTABLE_HELP_TEXT
    return
  }
  const childSchema = schemaObj
    ? (schemaObj.properties as Record<string, unknown> | undefined)?.[seg]
    : undefined
  const childUi = ensureChild(uiNode, seg)
  applyImmutablePath(childSchema, childUi, path, depth + 1)
}

function ensureChild(
  uiNode: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const existing = uiNode[key]
  if (existing && typeof existing === "object" && !Array.isArray(existing)) {
    const cloned = { ...(existing as Record<string, unknown>) }
    uiNode[key] = cloned
    return cloned
  }
  const fresh: Record<string, unknown> = {}
  uiNode[key] = fresh
  return fresh
}

interface SchemaFormProps {
  openAPISchema: string
  keysOrder?: string[][]
  formData: unknown
  onChange: (data: unknown) => void
  children?: React.ReactNode
  /**
   * When "enforce", fields whose schema carries a CEL immutability rule
   * (`self == oldSelf`) are rendered greyed out (disabled) with helper
   * text. Default "off" keeps every field editable — used for create
   * flows.
   */
  immutableMode?: "enforce" | "off"
}

export function SchemaForm(props: SchemaFormProps) {
  const parsedSchema = useMemo<unknown>(() => {
    try {
      return JSON.parse(props.openAPISchema)
    } catch {
      return {}
    }
  }, [props.openAPISchema])

  const sanitizedSchema = useMemo<RJSFSchema>(
    () => sanitizeSchema(parsedSchema) as RJSFSchema,
    [parsedSchema],
  )

  const hasDiskField = useMemo(
    () => schemaHasDiskField(sanitizedSchema),
    [sanitizedSchema],
  )

  // VMDisk lookup is gated behind a dedicated subcomponent so the K8s and
  // tenant providers are only required when the schema actually has a
  // disks[] field. Isolated SchemaForm tests use schemas without disks and
  // therefore never reach the K8s hook path.
  if (hasDiskField) {
    return (
      <SchemaFormWithDisks
        {...props}
        parsedSchema={parsedSchema}
        sanitizedSchema={sanitizedSchema}
      />
    )
  }
  return (
    <SchemaFormInner
      {...props}
      parsedSchema={parsedSchema}
      schema={sanitizedSchema}
    />
  )
}

function SchemaFormWithDisks(
  props: SchemaFormProps & { parsedSchema: unknown; sanitizedSchema: RJSFSchema },
) {
  const tenantCtx = useOptionalTenantContext()
  const tenantNamespace = tenantCtx?.tenantNamespace ?? null
  const { data: diskList } = useK8sList<VMDiskRef>(
    {
      apiGroup: APPS_GROUP,
      apiVersion: APPS_VERSION,
      plural: "vmdisks",
      namespace: tenantNamespace ?? undefined,
    },
    { enabled: !!tenantNamespace },
  )

  const diskNames = useMemo(
    () => (diskList?.items ?? []).map((d) => d.metadata.name),
    [diskList],
  )

  const schema = useMemo<RJSFSchema>(
    () => injectDiskEnum(props.sanitizedSchema, diskNames),
    [props.sanitizedSchema, diskNames],
  )

  return <SchemaFormInner {...props} schema={schema} />
}

function SchemaFormInner({
  keysOrder,
  formData,
  onChange,
  children,
  immutableMode,
  parsedSchema,
  schema,
}: SchemaFormProps & { parsedSchema: unknown; schema: RJSFSchema }) {

  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const formDataRef = useRef(formData)
  formDataRef.current = formData
  const emittedSchemaRef = useRef<RJSFSchema | null>(null)

  // Emit defaults to parent once per schema so spec is never empty on first submit.
  // Uses formDataRef (current parent state, not the initial mount snapshot) so
  // user input is preserved when the parent recomputes openAPISchema due to
  // async sibling data (e.g. plansData/backupClassesData loading) — without
  // this, getDefaultFormState would re-emit defaults computed from the stale
  // initial formData and wipe whatever the user already typed.
  useEffect(() => {
    if (!schema || Object.keys(schema).length === 0) return
    if (emittedSchemaRef.current === schema) return
    emittedSchemaRef.current = schema
    const defaults = getDefaultFormState(validator, schema, formDataRef.current ?? {}, schema)
    onChangeRef.current(defaults)
  }, [schema])

  const immutablePaths = useMemo<ImmutablePath[]>(
    () => (immutableMode === "enforce" ? findImmutablePaths(parsedSchema) : []),
    [parsedSchema, immutableMode],
  )

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

    // Automatically add AdditionalPropertiesField for fields with additionalProperties schema
    const withAdditionalProps = addAdditionalPropertiesWidgets(schema, withBackupClass)

    // Mask credential-shaped string fields (access/secret keys, passwords, tokens).
    const withSensitive = addSensitiveStringWidgets(schema, withAdditionalProps)

    // Override resourceQuotas field with structured quota editor.
    // Scoped to schemas where resourceQuotas has additionalProperties: {type: "string"}
    // (the cozystack-tenants chart shape) to avoid activating on unrelated CRDs.
    const rqSchema = (schema as any).properties?.resourceQuotas
    if (rqSchema && rqSchema.additionalProperties?.type === "string") {
      withSensitive.resourceQuotas = {
        ...withSensitive.resourceQuotas,
        "ui:field": "ResourceQuotasField",
      }
    }

    return addImmutableReadonly(schema, withSensitive, immutablePaths)
  }, [keysOrder, schema, immutablePaths])

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
