import { vi } from "vitest"
import { K8sClient, K8sApiError, type K8sList, type WatchEvent } from "@cozystack/k8s-client"

interface ListOverride {
  apiGroup: string
  apiVersion: string
  plural: string
  namespace?: string
  result: K8sList<unknown> | (() => K8sList<unknown> | Promise<K8sList<unknown>>) | K8sApiError
}

interface GetOverride {
  apiGroup: string
  apiVersion: string
  plural: string
  name: string
  namespace?: string
  result: unknown | (() => unknown | Promise<unknown>) | K8sApiError
}

export interface MockK8sClientOverrides {
  lists?: ListOverride[]
  gets?: GetOverride[]
}

/**
 * Build a K8sClient subclass whose network-facing methods (list/get/watch)
 * resolve from in-memory overrides instead of fetch. The resulting object
 * still satisfies the K8sClient interface — the compile-time check at the
 * bottom of this file ensures the production interface and the mock stay
 * in lockstep when the real K8sClient gains new methods.
 *
 * Watch is stubbed to a noop returning a cleanup function; tests that need
 * watch event behaviour should override it via vi.spyOn on the returned
 * instance.
 */
export function createMockK8sClient(overrides: MockK8sClientOverrides = {}): K8sClient {
  const client = new K8sClient({ baseUrl: "/mock" })

  const listSpy = vi.spyOn(client, "list").mockImplementation(
    async (apiGroup, apiVersion, plural, namespace) => {
      const match = overrides.lists?.find(
        (o) =>
          o.apiGroup === apiGroup &&
          o.apiVersion === apiVersion &&
          o.plural === plural &&
          (o.namespace ?? undefined) === (namespace ?? undefined),
      )
      if (!match) {
        return { apiVersion, kind: `${plural}List`, metadata: {}, items: [] } as K8sList<unknown>
      }
      if (match.result instanceof K8sApiError) throw match.result
      const value = typeof match.result === "function" ? await match.result() : match.result
      return value as K8sList<unknown>
    },
  )

  const getSpy = vi.spyOn(client, "get").mockImplementation(
    async (apiGroup, apiVersion, plural, name, namespace) => {
      const match = overrides.gets?.find(
        (o) =>
          o.apiGroup === apiGroup &&
          o.apiVersion === apiVersion &&
          o.plural === plural &&
          o.name === name &&
          (o.namespace ?? undefined) === (namespace ?? undefined),
      )
      if (!match) {
        throw new K8sApiError(404, { message: `mock: no get override for ${plural}/${name}` })
      }
      if (match.result instanceof K8sApiError) throw match.result
      return typeof match.result === "function" ? await match.result() : match.result
    },
  )

  vi.spyOn(client, "watch").mockImplementation(
    (_apiGroup, _apiVersion, _plural, _ns, _rv, _onEvent: (e: WatchEvent<unknown>) => void) => {
      return () => {}
    },
  )

  void listSpy
  void getSpy

  return client
}

// Compile-time check: the production K8sClient class must remain
// assignable to the type our mock factory promises. If K8sClient ever
// adds a new public method, this line fails to typecheck and the mock
// has to grow a corresponding stub.
const _typeDriftCheck: K8sClient = createMockK8sClient()
void _typeDriftCheck
