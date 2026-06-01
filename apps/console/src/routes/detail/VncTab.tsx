import { useEffect, useRef, useState } from "react"
import { Monitor } from "lucide-react"
import { Section, Spinner } from "@cozystack/ui"
import type { ApplicationDefinition, ApplicationInstance } from "@cozystack/types"

interface VncTabProps {
  ad: ApplicationDefinition
  instance: ApplicationInstance
}

export function VncTab({ ad, instance }: VncTabProps) {
  const ns = instance.metadata.namespace
  const appKind = ad.spec?.application.kind
  // The cozystack app name (e.g. "demo-vm") maps to the KubeVirt
  // VirtualMachineInstance named "<release.prefix><name>"
  // (e.g. "vm-instance-demo-vm"), which is what the subresource path needs.
  const vmName = `${ad.spec?.release?.prefix ?? ""}${instance.metadata.name}`
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(true)
  const [connected, setConnected] = useState(false)
  const vncContainerRef = useRef<HTMLDivElement>(null)
  const rfbRef = useRef<any>(null)

  useEffect(() => {
    if (appKind !== "VMInstance" || !vncContainerRef.current) return

    let mounted = true

    // Build WebSocket URL using current location
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const wsUrl = `${wsProtocol}//${window.location.host}/apis/subresources.kubevirt.io/v1/namespaces/${ns}/virtualmachineinstances/${vmName}/vnc`

    // Dynamically import RFB
    import("@novnc/novnc/lib/rfb").then((module) => {
      if (!mounted || !vncContainerRef.current) return

      // The module has nested default: module.default.default is the RFB constructor
      const RFB = (module as any).default?.default || module.default || module

      try {
        // Initialize noVNC RFB client
        const rfb = new RFB(vncContainerRef.current, wsUrl, {
          credentials: {},
        })

        // Set scaling mode
        rfb.scaleViewport = true
        rfb.resizeSession = false

        // Event handlers
        rfb.addEventListener("connect", () => {
          if (mounted) {
            setConnecting(false)
            setConnected(true)
            setError(null)
          }
        })

        rfb.addEventListener("disconnect", (e: any) => {
          if (mounted) {
            setConnecting(false)
            setConnected(false)
            if (!e.detail.clean) {
              setError(`Disconnected: ${e.detail.reason || "unknown reason"}`)
            }
          }
        })

        rfb.addEventListener("securityfailure", (e: any) => {
          if (mounted) {
            setConnecting(false)
            setConnected(false)
            setError(`Security failure: ${e.detail.status || "authentication failed"}`)
          }
        })

        rfbRef.current = rfb
      } catch (err) {
        if (mounted) {
          setConnecting(false)
          setError(`Failed to initialize VNC: ${(err as Error).message}`)
        }
      }
    }).catch((err) => {
      if (mounted) {
        setConnecting(false)
        setError(`Failed to load VNC library: ${err.message}`)
      }
    })

    // Cleanup on unmount
    return () => {
      mounted = false
      if (rfbRef.current) {
        rfbRef.current.disconnect()
        rfbRef.current = null
      }
    }
  }, [appKind, ns, vmName])

  if (appKind !== "VMInstance") {
    return (
      <div className="p-6">
        <Section>
          <p className="text-sm text-slate-500">VNC is only available for VMInstance.</p>
        </Section>
      </div>
    )
  }

  const handleCtrlAltDel = () => {
    if (rfbRef.current) {
      rfbRef.current.sendCtrlAltDel()
    }
  }

  const handleDisconnect = () => {
    if (rfbRef.current) {
      rfbRef.current.disconnect()
    }
  }

  const handleReconnect = () => {
    // Clear container and reinitialize
    if (vncContainerRef.current) {
      vncContainerRef.current.innerHTML = ""
      setConnecting(true)
      setError(null)

      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:"
      const wsUrl = `${wsProtocol}//${window.location.host}/apis/subresources.kubevirt.io/v1/namespaces/${ns}/virtualmachineinstances/${vmName}/vnc`

      import("@novnc/novnc/lib/rfb").then((module) => {
        if (!vncContainerRef.current) return

        // The module has nested default: module.default.default is the RFB constructor
        const RFB = (module as any).default?.default || module.default || module

        try {
          const rfb = new RFB(vncContainerRef.current, wsUrl, { credentials: {} })
          rfb.scaleViewport = true
          rfb.resizeSession = false

          rfb.addEventListener("connect", () => {
            setConnecting(false)
            setConnected(true)
            setError(null)
          })

          rfb.addEventListener("disconnect", (e: any) => {
            setConnecting(false)
            setConnected(false)
            if (!e.detail.clean) {
              setError(`Disconnected: ${e.detail.reason || "unknown reason"}`)
            }
          })

          rfb.addEventListener("securityfailure", (e: any) => {
            setConnecting(false)
            setConnected(false)
            setError(`Security failure: ${e.detail.status || "authentication failed"}`)
          })

          rfbRef.current = rfb
        } catch (err) {
          setConnecting(false)
          setError(`Failed to reconnect: ${(err as Error).message}`)
        }
      }).catch((err) => {
        setConnecting(false)
        setError(`Failed to load VNC library: ${err.message}`)
      })
    }
  }

  return (
    <div className="flex h-full flex-col p-6">
      <Section
        title={
          <span className="inline-flex items-center gap-2">
            <Monitor className="size-4 text-slate-500" /> VNC Console
          </span>
        }
      >
        <div className="mt-4 flex flex-col gap-3">
          {connecting && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Spinner /> Connecting to VNC...
            </div>
          )}
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              <strong>Connection Error:</strong> {error}
            </div>
          )}
          <div
            ref={vncContainerRef}
            className="rounded-lg border border-slate-200 bg-black overflow-hidden"
            style={{ height: "calc(100vh - 320px)", width: "100%" }}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleCtrlAltDel}
              disabled={!connected}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Ctrl+Alt+Del
            </button>
            <button
              onClick={handleDisconnect}
              disabled={!connected}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Disconnect
            </button>
            <button
              onClick={handleReconnect}
              disabled={connecting}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reconnect
            </button>
          </div>
        </div>
      </Section>
    </div>
  )
}
