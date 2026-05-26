export { K8sClient, K8sApiError } from "./client.ts"
export type {
  K8sClientConfig,
  K8sResource,
  K8sMetadata,
  K8sOwnerReference,
  K8sList,
  K8sCondition,
  WatchEvent,
  APIGroup,
  APIGroupList,
  APIGroupVersion,
} from "./client.ts"

export { K8sProvider, useK8sClient, useConnectionError } from "./provider.tsx"

export {
  useK8sList,
  useK8sGet,
  useK8sCreate,
  useK8sUpdate,
  useK8sDelete,
} from "./hooks.ts"
export type { ResourceRef } from "./hooks.ts"

export { useApiGroupAvailable } from "./useApiGroupAvailable.ts"
