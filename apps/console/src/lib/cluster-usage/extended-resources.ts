import type { Node } from "./types.ts"

const STANDARD_KEYS = new Set([
  "cpu",
  "memory",
  "ephemeral-storage",
  "pods",
])

function isExtendedKey(key: string): boolean {
  if (STANDARD_KEYS.has(key)) return false
  if (key.startsWith("hugepages-")) return false
  return true
}

/**
 * Returns the sorted, deduplicated set of extended-resource keys present
 * in any node's `status.capacity` across the cluster. Standard scheduler
 * resources (cpu, memory, ephemeral-storage, pods) and every hugepages-*
 * variant are filtered out — the rest is whatever the cluster exposes,
 * rendered verbatim. There is intentionally no vendor allow-list: a new
 * accelerator surfaces in the UI the moment a node exposing it joins.
 */
export function getExtendedResourceKeys(nodes: Node[]): string[] {
  const set = new Set<string>()
  for (const node of nodes) {
    const capacity = node.status?.capacity
    if (!capacity) continue
    for (const key of Object.keys(capacity)) {
      if (isExtendedKey(key)) set.add(key)
    }
  }
  return [...set].sort()
}

/**
 * Returns the sorted, deduplicated set of vendor prefixes derived from
 * a list of extended-resource keys. A key without a `/` is its own
 * prefix; this keeps the function total for malformed or non-namespaced
 * keys.
 */
export function getExtendedResourcePrefixes(keys: string[]): string[] {
  const set = new Set<string>()
  for (const key of keys) {
    const slash = key.indexOf("/")
    set.add(slash === -1 ? key : key.slice(0, slash))
  }
  return [...set].sort()
}
