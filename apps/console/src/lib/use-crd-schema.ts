import { useK8sGet } from "@cozystack/k8s-client"

interface CRDVersion {
  name: string
  schema?: {
    openAPIV3Schema?: {
      properties?: {
        spec?: any
      }
    }
  }
}

interface CRD {
  apiVersion: string
  kind: string
  metadata: {
    name: string
  }
  spec: {
    group: string
    versions: CRDVersion[]
  }
}

/**
 * Hook to fetch OpenAPI schema from a CRD's spec field
 */
export function useCRDSchema(crdName: string) {
  const { data: crd, isLoading, error } = useK8sGet<CRD>(
    {
      apiGroup: "apiextensions.k8s.io",
      apiVersion: "v1",
      plural: "customresourcedefinitions",
      name: crdName,
    },
    { enabled: !!crdName },
  )

  // Extract the schema from the first version's spec field
  const schema = crd?.spec?.versions?.[0]?.schema?.openAPIV3Schema?.properties?.spec

  return {
    schema: schema ? JSON.stringify(schema) : null,
    isLoading,
    error,
  }
}
