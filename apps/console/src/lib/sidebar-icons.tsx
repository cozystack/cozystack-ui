import type { ComponentType } from "react"
import {
  HardDrive,
  Network,
  Package,
  Server,
  Users,
  type LucideIcon,
} from "lucide-react"

/**
 * TODO(bff): move both of these mappings to the server. Ideally each
 * ApplicationDefinition carries a `spec.dashboard.iconSlug` (Simple Icons
 * slug) or `spec.dashboard.iconLucide` (a Lucide name) so the frontend
 * doesn't need a hardcoded table. Until then we keep the mapping here and
 * fall through to the generic Lucide fallback.
 */
const KIND_TO_SIMPLE_ICON: Record<string, string> = {
  // PaaS
  ClickHouse: "clickhouse",
  Harbor: "harbor",
  Kafka: "apachekafka",
  MariaDB: "mariadb",
  MongoDB: "mongodb",
  NATS: "natsdotio",
  OpenBAO: "vault",
  Postgres: "postgresql",
  Qdrant: "qdrant",
  RabbitMQ: "rabbitmq",
  Redis: "redis",

  // NaaS
  HTTPCache: "nginx",
  VPN: "wireguard",

  // Administration
  Etcd: "etcd",
  Ingress: "nginx",
  Kubernetes: "kubernetes",
  Monitoring: "prometheus",
}

/**
 * Lucide fallbacks for kinds that don't have a canonical brand logo in
 * Simple Icons. These use the same pack as cozyportal-ui.
 */
const KIND_TO_LUCIDE_ICON: Record<string, LucideIcon> = {
  Bucket: Package,
  VMInstance: Server,
  VMDisk: HardDrive,
  VirtualPrivateCloud: Network,
  Tenant: Users,
}

export function simpleIconSlug(kind: string): string | undefined {
  return KIND_TO_SIMPLE_ICON[kind]
}

export function lucideIcon(kind: string): LucideIcon | undefined {
  return KIND_TO_LUCIDE_ICON[kind]
}

/**
 * Build a monochromatic icon component that renders the Simple Icons SVG as a
 * CSS `mask-image`. The span takes its colour from `currentColor`, so active
 * sidebar items pick up the blue accent and inactive ones stay slate-400 —
 * exactly like the Lucide icons next to them.
 */
export function simpleIconComponent(slug: string): ComponentType<{ className?: string }> {
  const url = `url(https://cdn.simpleicons.org/${slug}/000000)`
  return function SimpleIcon({ className }) {
    return (
      <span
        aria-hidden
        className={className}
        style={{
          display: "inline-block",
          backgroundColor: "currentColor",
          maskImage: url,
          WebkitMaskImage: url,
          maskSize: "contain",
          WebkitMaskSize: "contain",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskPosition: "center",
        }}
      />
    )
  }
}
