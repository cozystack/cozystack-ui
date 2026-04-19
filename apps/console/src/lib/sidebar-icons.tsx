import type { ComponentType } from "react"

/**
 * TODO(bff): move this mapping to the server. Ideally each ApplicationDefinition
 * carries a `spec.dashboard.iconSlug` (or similar) pointing at a Simple Icons
 * slug, so the frontend doesn't need a hardcoded table. Until then we keep the
 * mapping here and fall through to the generic Lucide fallback.
 */
const KIND_TO_SIMPLE_ICON: Record<string, string> = {
  // IaaS
  Bucket: "amazons3",
  Kubernetes: "kubernetes",
  // VMInstance / VMDisk / VirtualPrivateCloud: no brand logos on Simple Icons

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
  Monitoring: "prometheus",
}

export function simpleIconSlug(kind: string): string | undefined {
  return KIND_TO_SIMPLE_ICON[kind]
}

/**
 * Build a React component that renders the Simple Icons CDN image for a given
 * slug, matching the `{ className?: string }` contract used by Lucide.
 */
export function simpleIconComponent(slug: string): ComponentType<{ className?: string }> {
  const src = `https://cdn.simpleicons.org/${slug}`
  return function SimpleIcon({ className }) {
    return (
      <img
        src={src}
        alt=""
        aria-hidden
        className={className}
        loading="lazy"
        onError={(e) => {
          // Gracefully hide if the slug doesn't exist.
          ;(e.currentTarget as HTMLImageElement).style.display = "none"
        }}
      />
    )
  }
}
