import { APPS_GROUP } from "@cozystack/types"

/**
 * Cluster API stamps `cluster.x-k8s.io/cluster-name` on every object it owns,
 * including the KubeVirt worker-node VMs (and their virt-launcher pods) of a
 * tenant Kubernetes cluster. Cozystack names that CAPI cluster after the
 * `kubernetes` app instance with the chart name as a prefix, so the cluster
 * `kubernetes-test` belongs to the `kubernetes` app instance `test`.
 */
const CAPI_CLUSTER_NAME_LABEL = "cluster.x-k8s.io/cluster-name"
const KUBERNETES_APP_KIND = "Kubernetes"
const KUBERNETES_CLUSTER_PREFIX = "kubernetes-"

/**
 * Derive the owning application (kind + name) of a resource from its labels.
 * Cozystack's lineage controller stamps apps.cozystack.io/application.{kind,name}
 * on every workload object (Pods, PVCs, Services, …); we fall back to the Helm
 * instance/name labels and finally to the resource's own name so nothing is
 * silently dropped.
 *
 * One class of object is *not* stamped with the lineage labels: the worker-node
 * VMs of a tenant Kubernetes cluster. Those are created by Cluster API / the
 * KubeVirt provider, so they only carry CAPI labels. We special-case them here
 * and attribute them back to the owning `kubernetes` app instance, so they link
 * to its Console page just like a standalone VMInstance does.
 */
export function workloadOwner(
  labels: Record<string, string> | undefined,
  fallbackName: string,
): { kind: string; name: string } {
  const l = labels ?? {}

  // Tenant Kubernetes-cluster VMs carry only CAPI labels, not the cozystack
  // lineage labels. Map them to the owning `kubernetes` app instance so worker
  // VMs of the same cluster group together and deep-link to its app page.
  const clusterName = l[CAPI_CLUSTER_NAME_LABEL]
  if (clusterName && clusterName.startsWith(KUBERNETES_CLUSTER_PREFIX)) {
    const instance = clusterName.slice(KUBERNETES_CLUSTER_PREFIX.length)
    if (instance) return { kind: KUBERNETES_APP_KIND, name: instance }
  }

  const kind = l[`${APPS_GROUP}/application.kind`]
  const name =
    l[`${APPS_GROUP}/application.name`] ??
    l["app.kubernetes.io/instance"] ??
    l["app.kubernetes.io/name"]
  if (kind && name) return { kind, name }
  if (name) return { kind: kind ?? "—", name }
  return { kind: kind ?? "—", name: fallbackName }
}
