import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query"
import { useEffect, useRef } from "react"
import { useK8sClient } from "./provider.tsx"
import type { K8sList, K8sResource } from "./client.ts"

export interface ResourceRef {
  apiGroup: string
  apiVersion: string
  plural: string
  namespace?: string
}

export function useK8sList<T extends K8sResource>(
  ref: ResourceRef,
  options?: Omit<UseQueryOptions<K8sList<T>>, "queryKey" | "queryFn"> & {
    watch?: boolean
    labelSelector?: string
    fieldSelector?: string
  },
) {
  const client = useK8sClient()
  const queryClient = useQueryClient()
  const { labelSelector, fieldSelector, watch: watchOpt, ...queryOptions } = options ?? {}
  const queryKey = k8sListKey(ref, labelSelector, fieldSelector)
  const enabled = queryOptions.enabled !== false
  const watchEnabled = watchOpt !== false
  const cleanupRef = useRef<(() => void) | null>(null)

  const query = useQuery<K8sList<T>>({
    queryKey,
    queryFn: () =>
      client.list<T>(ref.apiGroup, ref.apiVersion, ref.plural, ref.namespace, {
        labelSelector,
        fieldSelector,
      }),
    ...queryOptions,
  })

  const resourceVersion = query.data?.metadata?.resourceVersion

  useEffect(() => {
    cleanupRef.current?.()
    cleanupRef.current = null

    if (!enabled || !watchEnabled || !resourceVersion) return

    cleanupRef.current = client.watch<T>(
      ref.apiGroup,
      ref.apiVersion,
      ref.plural,
      ref.namespace,
      resourceVersion,
      (event) => {
        if (event.type === "BOOKMARK") return
        if (event.type === "ERROR") {
          queryClient.invalidateQueries({ queryKey })
          return
        }
        queryClient.setQueryData<K8sList<T>>(queryKey, (old) => {
          if (!old) return old
          const items = [...old.items]
          const idx = items.findIndex(
            (i) =>
              i.metadata.name === event.object.metadata.name &&
              i.metadata.namespace === event.object.metadata.namespace,
          )
          switch (event.type) {
            case "ADDED":
              if (idx === -1) items.push(event.object)
              else items[idx] = event.object
              break
            case "MODIFIED":
              if (idx >= 0) items[idx] = event.object
              else items.push(event.object)
              break
            case "DELETED":
              if (idx >= 0) items.splice(idx, 1)
              break
          }
          return { ...old, items }
        })
      },
      () => {
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey })
        }, 1000)
      },
    )

    return () => {
      cleanupRef.current?.()
      cleanupRef.current = null
    }
  }, [
    resourceVersion,
    enabled,
    watchEnabled,
    ref.apiGroup,
    ref.apiVersion,
    ref.plural,
    ref.namespace,
    labelSelector,
    fieldSelector,
  ])

  return query
}

export function useK8sGet<T extends K8sResource>(
  ref: ResourceRef & { name: string },
  options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">,
) {
  const client = useK8sClient()
  const queryKey = k8sGetKey(ref)

  return useQuery<T>({
    queryKey,
    queryFn: () =>
      client.get<T>(ref.apiGroup, ref.apiVersion, ref.plural, ref.name, ref.namespace),
    ...options,
  })
}

export function useK8sCreate<T extends K8sResource>(ref: ResourceRef) {
  const client = useK8sClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: T) =>
      client.create<T>(ref.apiGroup, ref.apiVersion, ref.plural, body, ref.namespace),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: k8sListKey(ref) })
    },
  })
}

export function useK8sUpdate<T extends K8sResource>(ref: ResourceRef) {
  const client = useK8sClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: T) =>
      client.update<T>(
        ref.apiGroup,
        ref.apiVersion,
        ref.plural,
        body.metadata.name,
        body,
        ref.namespace,
      ),
    onSuccess: (data, variables) => {
      const getKey = k8sGetKey({ ...ref, name: variables.metadata.name })
      queryClient.setQueryData(getKey, data)
      queryClient.invalidateQueries({ queryKey: k8sListKey(ref) })
    },
  })
}

export function useK8sDelete(ref: ResourceRef) {
  const client = useK8sClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) =>
      client.delete(ref.apiGroup, ref.apiVersion, ref.plural, name, ref.namespace),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: k8sListKey(ref) })
    },
  })
}

function k8sListKey(ref: ResourceRef, labelSelector?: string, fieldSelector?: string) {
  return [
    "k8s",
    ref.apiGroup,
    ref.apiVersion,
    ref.plural,
    ref.namespace ?? "",
    labelSelector ?? "",
    fieldSelector ?? "",
  ] as const
}

function k8sGetKey(ref: ResourceRef & { name: string }) {
  return [
    "k8s",
    ref.apiGroup,
    ref.apiVersion,
    ref.plural,
    ref.namespace ?? "",
    ref.name,
  ] as const
}
