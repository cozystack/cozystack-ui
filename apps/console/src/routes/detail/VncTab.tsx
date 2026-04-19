import { Monitor } from "lucide-react"
import type { ApplicationDefinition, ApplicationInstance } from "@cozystack/types"

interface VncTabProps {
  ad: ApplicationDefinition
  instance: ApplicationInstance
}

/**
 * VNC console for VMInstance. The Cozystack VM chart deploys a KubeVirt
 * VirtualMachineInstance whose name matches the app instance name. We embed
 * the KubeVirt subresource-apiserver VNC endpoint via the existing kubectl
 * proxy (no extra BFF required).
 *
 * TODO(kvaps): the KubeVirt VNC endpoint needs a WebSocket upgrade that
 * kubectl proxy supports, plus the `novnc-next` library to draw the framebuffer.
 * For now we surface the expected websocket URL so users can open it via
 * their own tooling.
 */
export function VncTab({ ad, instance }: VncTabProps) {
  const ns = instance.metadata.namespace
  const appKind = ad.spec?.application.kind
  if (appKind !== "VMInstance") {
    return <div className="p-6 text-sm text-slate-500">VNC is only available for VMInstance.</div>
  }
  const wsUrl =
    `/apis/subresources.kubevirt.io/v1/namespaces/${ns}` +
    `/virtualmachineinstances/${instance.metadata.name}/vnc`

  return (
    <div className="p-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-3 text-slate-600">
          <Monitor className="h-5 w-5" />
          <h3 className="text-base font-semibold text-slate-900">VNC Console</h3>
        </div>
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
      </div>
    </div>
  )
}
