import { useK8sList } from "@cozystack/k8s-client"
import { Section, Spinner } from "@cozystack/ui"
import type {
  ApplicationDefinition,
  ApplicationInstance,
} from "@cozystack/types"
import { useTenantContext } from "../../lib/tenant-context.tsx"
import { formatAge } from "../../lib/status.ts"

interface EventsTabProps {
  ad: ApplicationDefinition
  instance: ApplicationInstance
}

interface K8sEvent {
  metadata: {
    name: string
    namespace: string
    creationTimestamp: string
  }
  involvedObject?: {
    apiVersion?: string
    kind?: string
    name?: string
    namespace?: string
    uid?: string
  }
  type?: string
  reason?: string
  message?: string
  source?: {
    component?: string
    host?: string
  }
  firstTimestamp?: string
  lastTimestamp?: string
  count?: number
}

interface K8sPod {
  metadata: {
    name: string
  }
}

export function EventsTab({ ad: _ad, instance }: EventsTabProps) {
  const { tenantNamespace } = useTenantContext()

  // Load Pods belonging to this application
  const { data: podsList } = useK8sList<K8sPod>(
    {
      apiGroup: "",
      apiVersion: "v1",
      plural: "pods",
      namespace: tenantNamespace ?? undefined,
    },
    {
      enabled: !!tenantNamespace,
      labelSelector: `apps.cozystack.io/application.name=${instance.metadata.name}`,
    },
  )

  const { data: eventsList, isLoading } = useK8sList<K8sEvent>(
    {
      apiGroup: "",
      apiVersion: "v1",
      plural: "events",
      namespace: tenantNamespace ?? undefined,
    },
    {
      enabled: !!tenantNamespace,
    },
  )

  // Build set of resource names that belong to this application
  const allEvents = eventsList?.items || []
  const pods = podsList?.items || []
  const relatedResourceNames = new Set<string>([
    instance.metadata.name, // The instance itself
    ...pods.map((pod) => pod.metadata.name), // All pods
  ])

  // Filter events related to this application
  const events = allEvents.filter(
    (event) => event.involvedObject?.name && relatedResourceNames.has(event.involvedObject.name)
  )

  // Sort by lastTimestamp descending (most recent first)
  const sortedEvents = [...events].sort((a, b) => {
    const timeA = a.lastTimestamp || a.firstTimestamp || a.metadata.creationTimestamp
    const timeB = b.lastTimestamp || b.firstTimestamp || b.metadata.creationTimestamp
    return new Date(timeB).getTime() - new Date(timeA).getTime()
  })

  if (isLoading) {
    return (
      <div className="p-6">
        <Section title="Events" bodyClassName="p-0">
          <div className="flex items-center gap-2 px-5 py-4 text-xs text-slate-500">
            <Spinner /> Loading events…
          </div>
        </Section>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="p-6">
        <Section title="Events" bodyClassName="p-0">
          <div className="px-5 py-4 text-center text-sm text-slate-500">
            No events found for this resource.
          </div>
        </Section>
      </div>
    )
  }

  return (
    <div className="p-6">
      <Section title="Events" bodyClassName="p-0">
        <ul className="divide-y divide-slate-100">
          {sortedEvents.map((event) => {
            const timestamp = event.lastTimestamp || event.firstTimestamp || event.metadata.creationTimestamp
            const from = event.source?.component || event.source?.host || "-"
            const typeColor = event.type === "Warning" ? "text-amber-600" : "text-slate-600"
            const objectName = event.involvedObject
              ? `${event.involvedObject.kind}/${event.involvedObject.name}`
              : "-"

            return (
              <li key={event.metadata.name} className="px-5 py-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <span className={`text-xs font-medium ${typeColor}`}>
                      {event.type || "Normal"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-mono text-xs text-slate-700">
                        {objectName}
                      </span>
                      <span className="text-xs font-medium text-slate-900">
                        {event.reason}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 break-words">
                      {event.message}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                      <span>{formatAge(timestamp)}</span>
                      {event.count && event.count > 1 && (
                        <span>×{event.count}</span>
                      )}
                      <span>{from}</span>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </Section>
    </div>
  )
}
