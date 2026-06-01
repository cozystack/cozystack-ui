import { useState } from "react"
import { Play, Square, RotateCw } from "lucide-react"
import { Button, StatusBadge } from "@cozystack/ui"
import {
  useK8sGet,
  useK8sSubresource,
  type K8sResource,
} from "@cozystack/k8s-client"
import type { ApplicationDefinition, ApplicationInstance } from "@cozystack/types"

// KubeVirt serves the VirtualMachine object under kubevirt.io and the
// start/stop/restart action endpoints under the subresources.kubevirt.io
// aggregated API. Tenant access to the action subresources is granted by the
// cozy:tenant:use ClusterRole (verb "update").
const KUBEVIRT_GROUP = "kubevirt.io"
const KUBEVIRT_SUBRESOURCE_GROUP = "subresources.kubevirt.io"
const KUBEVIRT_VERSION = "v1"

interface VMStatus {
  printableStatus?: string
}

type Power = "start" | "stop" | "restart"

export function VMPowerControls({
  ad,
  instance,
}: {
  ad: ApplicationDefinition
  instance: ApplicationInstance
}) {
  const ns = instance.metadata.namespace ?? ""
  // The cozystack app name (e.g. "demo-vm") maps to the KubeVirt
  // VirtualMachine named "<release.prefix><name>" (e.g. "vm-instance-demo-vm").
  const prefix = ad.spec?.release?.prefix ?? ""
  const vmName = `${prefix}${instance.metadata.name}`

  const { data: vm } = useK8sGet<K8sResource<unknown, VMStatus>>(
    {
      apiGroup: KUBEVIRT_GROUP,
      apiVersion: KUBEVIRT_VERSION,
      plural: "virtualmachines",
      name: vmName,
      namespace: ns,
    },
    {
      enabled: !!vmName && !!ns,
      refetchInterval: 5000,
    },
  )

  const action = useK8sSubresource({
    apiGroup: KUBEVIRT_SUBRESOURCE_GROUP,
    apiVersion: KUBEVIRT_VERSION,
    plural: "virtualmachines",
    name: vmName,
    namespace: ns,
  })

  const [pending, setPending] = useState<Power | null>(null)

  const status = vm?.status?.printableStatus
  const isRunning = status === "Running"
  const isStopped = status === "Stopped" || status === "Halted"
  const busy = action.isPending || pending !== null

  const run = async (sub: Power, confirmMsg?: string) => {
    if (confirmMsg && !confirm(confirmMsg)) return
    setPending(sub)
    try {
      await action.mutateAsync({ subresource: sub })
    } catch (err) {
      alert(`Failed to ${sub} VM: ${(err as Error).message}`)
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {status && (
        <StatusBadge tone={isRunning ? "ok" : "warn"}>{status}</StatusBadge>
      )}
      <Button
        variant="outline"
        size="sm"
        disabled={busy || !isStopped}
        onClick={() => run("start")}
      >
        <Play className="size-3.5" /> Start
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={busy || !isRunning}
        onClick={() =>
          run("restart", `Restart VM "${instance.metadata.name}"?`)
        }
      >
        <RotateCw className="size-3.5" /> Restart
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={busy || !isRunning}
        onClick={() => run("stop", `Stop VM "${instance.metadata.name}"?`)}
      >
        <Square className="size-3.5" /> Stop
      </Button>
    </div>
  )
}
