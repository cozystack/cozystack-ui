import { describe, it, expect } from "vitest"
import { workloadOwner } from "./workload.ts"

describe("workloadOwner", () => {
  it("uses cozystack lineage labels when present (VMInstance case)", () => {
    expect(
      workloadOwner(
        {
          "apps.cozystack.io/application.kind": "VMInstance",
          "apps.cozystack.io/application.name": "demo-vm",
          "app.kubernetes.io/instance": "vm-instance-demo-vm",
        },
        "virt-launcher-vm-instance-demo-vm-kngcm",
      ),
    ).toEqual({ kind: "VMInstance", name: "demo-vm" })
  })

  it("maps a tenant Kubernetes-cluster worker VM to its kubernetes app instance", () => {
    // Worker-node VM pods carry only CAPI labels, no cozystack lineage labels.
    const labels = {
      "capk.cluster.x-k8s.io/kubevirt-machine-name": "kubernetes-test-gpu-g85nk-d79tb",
      "capk.cluster.x-k8s.io/kubevirt-machine-namespace": "tenant-root",
      "cluster.x-k8s.io/cluster-name": "kubernetes-test",
      "cluster.x-k8s.io/role": "worker",
      "kubevirt.io/vm": "kubernetes-test-gpu-g85nk-d79tb",
    }
    expect(
      workloadOwner(labels, "virt-launcher-kubernetes-test-gpu-g85nk-d79tb-99qx7"),
    ).toEqual({ kind: "Kubernetes", name: "test" })
  })

  it("groups all worker VMs of the same cluster under one owner", () => {
    const cluster = (machine: string) => ({
      "cluster.x-k8s.io/cluster-name": "kubernetes-test",
      "cluster.x-k8s.io/role": "worker",
      "kubevirt.io/vm": machine,
    })
    const a = workloadOwner(cluster("kubernetes-test-gpu-g85nk-84hq7"), "virt-launcher-a")
    const b = workloadOwner(cluster("kubernetes-test-md0-tmz5w-wv7v2"), "virt-launcher-b")
    expect(a).toEqual(b)
    expect(a).toEqual({ kind: "Kubernetes", name: "test" })
  })

  it("falls back to lineage labels when the CAPI cluster name lacks the kubernetes prefix", () => {
    // Defensive: a CAPI cluster not named kubernetes-<instance> should not be
    // misattributed to a kubernetes app instance.
    expect(
      workloadOwner(
        {
          "cluster.x-k8s.io/cluster-name": "some-other-cluster",
          "app.kubernetes.io/instance": "foo",
        },
        "pod-foo",
      ),
    ).toEqual({ kind: "—", name: "foo" })
  })

  it("ignores an empty instance after stripping the prefix", () => {
    expect(
      workloadOwner({ "cluster.x-k8s.io/cluster-name": "kubernetes-" }, "pod-x"),
    ).toEqual({ kind: "—", name: "pod-x" })
  })

  it("falls back to the Helm instance label", () => {
    expect(
      workloadOwner({ "app.kubernetes.io/instance": "my-postgres" }, "my-postgres-1"),
    ).toEqual({ kind: "—", name: "my-postgres" })
  })

  it("falls back to app.kubernetes.io/name when instance is absent", () => {
    expect(
      workloadOwner({ "app.kubernetes.io/name": "redis" }, "redis-abc"),
    ).toEqual({ kind: "—", name: "redis" })
  })

  it("keeps kind when only kind is present", () => {
    expect(
      workloadOwner(
        { "apps.cozystack.io/application.kind": "Deployment" },
        "deploy-pod-1",
      ),
    ).toEqual({ kind: "Deployment", name: "deploy-pod-1" })
  })

  it("falls back to the resource name when no useful labels are present", () => {
    expect(workloadOwner({}, "lonely-pod")).toEqual({ kind: "—", name: "lonely-pod" })
    expect(workloadOwner(undefined, "lonely-pod")).toEqual({
      kind: "—",
      name: "lonely-pod",
    })
  })
})
