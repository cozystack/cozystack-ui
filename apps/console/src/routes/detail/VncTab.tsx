import { useEffect, useRef, useState } from "react"
import { Monitor, Maximize2, Minimize2, RotateCcw, Power } from "lucide-react"
import { Section, Spinner } from "@cozystack/ui"
import { useK8sGet, type K8sResource } from "@cozystack/k8s-client"
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
  // Don't open a VNC websocket unless the VM is actually running — there is no
  // VirtualMachineInstance to attach to otherwise, and the socket would just
  // error out. Poll the VirtualMachine power state.
  const { data: vm, isLoading: vmLoading } = useK8sGet<
    K8sResource<unknown, { printableStatus?: string }>
  >(
    {
      apiGroup: "kubevirt.io",
      apiVersion: "v1",
      plural: "virtualmachines",
      name: vmName,
      namespace: ns ?? "",
    },
    {
      enabled: appKind === "VMInstance" && !!vmName && !!ns,
      refetchInterval: 5000,
    },
  )
  const powerStatus = vm?.status?.printableStatus
  const isRunning = powerStatus === "Running"

  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(true)
  const [connected, setConnected] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  // Bumped to force the connection effect to re-run on manual reconnect.
  const [connectionKey, setConnectionKey] = useState(0)
  const [desktopSize, setDesktopSize] = useState<{
    width: number
    height: number
  } | null>(null)
  const vncContainerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- noVNC RFB has no bundled types
  const rfbRef = useRef<any>(null)

  useEffect(() => {
    if (appKind !== "VMInstance" || !isRunning || !vncContainerRef.current)
      return
    const el = vncContainerRef.current
    while (el.firstChild) el.removeChild(el.firstChild)

    let mounted = true
    setConnecting(true)
    setConnected(false)
    setError(null)
    setDesktopSize(null)

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const wsUrl = `${wsProtocol}//${window.location.host}/apis/subresources.kubevirt.io/v1/namespaces/${ns}/virtualmachineinstances/${vmName}/vnc`

    import("@novnc/novnc/lib/rfb")
      .then((module) => {
        if (!mounted || !vncContainerRef.current) return
        // The module has nested default: module.default.default is the RFB constructor
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- noVNC RFB has no bundled types
        const RFB = (module as any).default?.default || module.default || module

        try {
          const rfb = new RFB(vncContainerRef.current, wsUrl, { credentials: {} })
          rfb.scaleViewport = true
          rfb.resizeSession = false

          rfb.addEventListener("connect", () => {
            if (!mounted) return
            setConnecting(false)
            setConnected(true)
            setError(null)
            // Read the desktop size from the canvas so the box keeps the
            // guest's aspect ratio instead of letterboxing.
            requestAnimationFrame(() => {
              const canvas = el.querySelector("canvas")
              if (canvas) {
                setDesktopSize({ width: canvas.width, height: canvas.height })
              }
            })
          })

          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- noVNC event detail is untyped
          rfb.addEventListener("disconnect", (e: any) => {
            if (!mounted) return
            setConnecting(false)
            setConnected(false)
            if (!e.detail?.clean) {
              setError(`Disconnected: ${e.detail?.reason || "unknown reason"}`)
            }
          })

          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- noVNC event detail is untyped
          rfb.addEventListener("securityfailure", (e: any) => {
            if (!mounted) return
            setConnecting(false)
            setConnected(false)
            setError(`Security failure: ${e.detail?.status || "authentication failed"}`)
          })

          rfbRef.current = rfb
        } catch (err) {
          if (mounted) {
            setConnecting(false)
            setError(`Failed to initialize VNC: ${(err as Error).message}`)
          }
        }
      })
      .catch((err) => {
        if (mounted) {
          setConnecting(false)
          setError(`Failed to load VNC library: ${err.message}`)
        }
      })

    return () => {
      mounted = false
      if (rfbRef.current) {
        try {
          rfbRef.current.disconnect()
        } catch {
          /* ignore: socket may already be closed */
        }
        rfbRef.current = null
      }
    }
  }, [appKind, ns, vmName, isRunning, connectionKey])

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", handler)
    return () => document.removeEventListener("fullscreenchange", handler)
  }, [])

  if (appKind !== "VMInstance") {
    return (
      <div className="p-6">
        <Section>
          <p className="text-sm text-slate-500">VNC is only available for VMInstance.</p>
        </Section>
      </div>
    )
  }

  if (vmLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
        <Spinner /> Loading…
      </div>
    )
  }

  if (!isRunning) {
    return (
      <div className="p-6">
        <Section
          title={
            <span className="inline-flex items-center gap-2">
              <Monitor className="size-4 text-slate-500" /> VNC Console
            </span>
          }
        >
          <p className="text-sm text-slate-500">
            The virtual machine is not running
            {powerStatus ? ` (status: ${powerStatus})` : ""}. Start it to use
            the VNC console.
          </p>
        </Section>
      </div>
    )
  }

  const handleFullscreen = () => {
    const wrapper = vncContainerRef.current?.parentElement
    if (!wrapper) return
    if (!document.fullscreenElement) {
      wrapper.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const reconnect = () => {
    if (rfbRef.current) {
      try {
        rfbRef.current.disconnect()
      } catch {
        /* ignore: socket may already be closed */
      }
      rfbRef.current = null
    }
    setConnectionKey((k) => k + 1)
  }

  const status = connected
    ? "Connected"
    : connecting
      ? "Connecting…"
      : "Disconnected"

  return (
    <div className="p-6">
      <div className="flex flex-col rounded-lg border border-slate-200 bg-black">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-slate-700 bg-slate-900 px-3 py-1.5">
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-slate-400" />
            <span className="text-xs text-slate-400">{status}</span>
            {connected && <span className="h-1.5 w-1.5 rounded-full bg-green-500" />}
          </div>
          <div className="flex items-center gap-1">
            {connected && (
              <button
                onClick={() => rfbRef.current?.sendCtrlAltDel()}
                className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-white"
                title="Ctrl+Alt+Del"
              >
                <Power className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={handleFullscreen}
              className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-white"
              title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {fullscreen ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              onClick={reconnect}
              className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-white"
              title="Reconnect"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* VNC canvas */}
        <div
          className={`relative mx-auto overflow-hidden${fullscreen ? " my-auto" : ""}`}
          style={
            desktopSize
              ? {
                  aspectRatio: `${desktopSize.width} / ${desktopSize.height}`,
                  width: fullscreen
                    ? `min(100%, calc((100vh - 36px) * ${desktopSize.width} / ${desktopSize.height}))`
                    : `min(100%, calc((100vh - 320px) * ${desktopSize.width} / ${desktopSize.height}))`,
                }
              : { height: "calc(100vh - 320px)", width: "100%" }
          }
        >
          {connecting && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
              <span className="text-sm text-slate-500">Connecting to VNC…</span>
            </div>
          )}
          {error && !connecting && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
              <div className="text-center">
                <p className="text-sm text-red-400">{error}</p>
                <button
                  onClick={reconnect}
                  className="mt-2 rounded bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700"
                >
                  Reconnect
                </button>
              </div>
            </div>
          )}
          <div ref={vncContainerRef} className="absolute inset-0" />
        </div>
      </div>
    </div>
  )
}
