import { Monitor } from "lucide-react"
import { Section } from "@cozystack/ui"
import type { ApplicationDefinition, ApplicationInstance } from "@cozystack/types"

interface VncTabProps {
  ad: ApplicationDefinition
  instance: ApplicationInstance
}

export function VncTab({ ad, instance }: VncTabProps) {
  const ns = instance.metadata.namespace
  const appKind = ad.spec?.application.kind
  if (appKind !== "VMInstance") {
    return (
      <div className="p-6">
        <Section>
          <p className="text-sm text-slate-500">VNC is only available for VMInstance.</p>
        </Section>
      </div>
    )
  }
  const wsUrl =
    `/apis/subresources.kubevirt.io/v1/namespaces/${ns}` +
    `/virtualmachineinstances/${instance.metadata.name}/vnc`

  return (
    <div className="p-6">
      <Section
        title={
          <span className="inline-flex items-center gap-2">
            <Monitor className="size-4 text-slate-500" /> VNC Console
          </span>
        }
      >
        <p className="text-sm text-slate-600">
          The KubeVirt VNC endpoint is available at:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-md bg-slate-50 p-3 text-xs text-slate-800">
          ws(s)://{`<host>`}
          {wsUrl}
        </pre>
        <p className="mt-3 text-xs text-slate-500">
          Interactive framebuffer rendering is coming — for now the console must
          be opened with a standalone VNC client that speaks the KubeVirt
          websocket protocol (e.g. virtctl vnc).
        </p>
      </Section>
    </div>
  )
}
