import { useMemo } from "react"
import {
  useK8sList,
  useApiGroupAvailable,
  type K8sList,
} from "@cozystack/k8s-client"
import { aggregateNodeResources } from "../lib/cluster-usage/aggregate.ts"
import { derivePerNodeRows } from "../lib/cluster-usage/per-node.ts"
import type {
  AggregateResources,
  Node,
  NodeMetrics,
  NodeRow,
  Pod,
} from "../lib/cluster-usage/types.ts"

/**
 * Polling interval for NodeMetrics. Matches the default
 * --metric-resolution of metrics-server (15s) plus a small buffer; a
 * faster cadence returns identical values and wastes requests.
 */
export const CLUSTER_USAGE_METRICS_REFETCH_MS = 30_000

interface ClusterUsageData {
  nodes: Node[]
  pods: Pod[]
  metrics: NodeMetrics[] | undefined
  aggregates: AggregateResources
  perNode: NodeRow[]
  isLoading: boolean
  error: Error | null
  metricsAvailable: boolean
}

/**
 * Composite hook that powers the Cluster Usage admin page. Subscribes
 * to nodes and pods via K8s watches (low cost, push-based updates), and
 * — only when metrics.k8s.io is discovered on the cluster — polls
 * NodeMetrics on a 30-second cadence. metrics.k8s.io is not watchable,
 * so a refetch interval is the only option; the rest of the page works
 * fine without it.
 *
 * A 403 on the metrics fetch is treated as 'no usage data, but no
 * page-level error' — the Used overlay disappears, the rest of the
 * panel still renders. Nodes-list or pods-list errors are surfaced as
 * the hook's error so the page can render an explicit failure state.
 */
export function useClusterUsageData(): ClusterUsageData {
  const nodesQuery = useK8sList<Node>({
    apiGroup: "",
    apiVersion: "v1",
    plural: "nodes",
  })

  const podsQuery = useK8sList<Pod>({
    apiGroup: "",
    apiVersion: "v1",
    plural: "pods",
  })

  const { available: metricsAvailable, isLoading: metricsDiscoveryLoading } =
    useApiGroupAvailable("metrics.k8s.io")

  const metricsQuery = useK8sList<NodeMetrics>(
    {
      apiGroup: "metrics.k8s.io",
      apiVersion: "v1beta1",
      plural: "nodes",
    },
    {
      enabled: metricsAvailable,
      watch: false,
      refetchInterval: CLUSTER_USAGE_METRICS_REFETCH_MS,
    },
  )

  const nodes = nodesQuery.data?.items ?? []
  const pods = podsQuery.data?.items ?? []
  const metricsItems = metricsQueryItems(metricsQuery.data, metricsQuery.error)

  const aggregates = useMemo(
    () => aggregateNodeResources(nodes, pods, metricsItems),
    [nodes, pods, metricsItems],
  )
  const perNode = useMemo(
    () => derivePerNodeRows(nodes, pods, metricsItems),
    [nodes, pods, metricsItems],
  )

  return {
    nodes,
    pods,
    metrics: metricsItems,
    aggregates,
    perNode,
    isLoading:
      nodesQuery.isLoading || podsQuery.isLoading || metricsDiscoveryLoading,
    // Metrics errors do not become page errors — usage simply disappears.
    error: (nodesQuery.error as Error | null) ?? (podsQuery.error as Error | null) ?? null,
    metricsAvailable,
  }
}

function metricsQueryItems(
  list: K8sList<NodeMetrics> | undefined,
  error: unknown,
): NodeMetrics[] | undefined {
  if (error) return undefined
  if (!list) return undefined
  return list.items
}
