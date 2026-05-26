// Pure label-derivation logic for .github/workflows/pr-labeler.yaml.
// Kept as a standalone module so it can be unit-tested with `node --test`
// (.github/scripts/pr-labeler.test.js) without spinning up the workflow.

// Conventional Commits types accepted by cozystack-ui:
//   feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
// Mapping below maps a subset to kind/* — types not listed do not produce a kind/*.
export const typeToKind = {
  feat:     'kind/feature',
  fix:      'kind/bug',
  docs:     'kind/documentation',
  chore:    'kind/cleanup',
  refactor: 'kind/cleanup',
  // style, perf, test, build, ci, revert — no kind mapping
}

// scope -> area/* mapping. Keys are the scopes observed in cozystack-ui issues
// and PRs. Add new entries when a scope recurs (3+ times).
export const scopeToArea = {
  // area/console — apps/console: routes, detail pages, marketplace,
  // command palette, top-level app shell wiring.
  'console':               'area/console',
  'app':                   'area/console',
  'routes':                'area/console',
  'detail':                'area/console',
  'overview':              'area/console',
  'marketplace':           'area/console',
  'command-palette':       'area/console',
  'palette':               'area/console',

  // area/forms — RJSF schema forms and the per-field widgets that back them.
  // Specific widget names route here too.
  'forms':                 'area/forms',
  'form':                  'area/forms',
  'schema':                'area/forms',
  'schema-form':           'area/forms',
  'rjsf':                  'area/forms',
  'widgets':               'area/forms',
  'widget':                'area/forms',
  'backup':                'area/forms',
  'backups':               'area/forms',
  'external-ips':          'area/forms',
  'storage-class':         'area/forms',
  'storageclass':          'area/forms',
  'vm-disk':               'area/forms',
  'vmdisk':                'area/forms',
  'sensitive':             'area/forms',
  'quota':                 'area/forms',
  'quotas':                'area/forms',
  'source':                'area/forms',
  'additional-properties': 'area/forms',
  'key-value':             'area/forms',

  // area/k8s-client — packages/k8s-client: K8sClient, React Query hooks,
  // the watch layer.
  'k8s-client':            'area/k8s-client',
  'k8s':                   'area/k8s-client',
  'client':                'area/k8s-client',
  'watch':                 'area/k8s-client',

  // area/ui — packages/ui: AppShell, Sidebar, Header, Button, Dropdown,
  // StatusBadge, Spinner, Section, primitives.
  'ui':                    'area/ui',
  'app-shell':             'area/ui',
  'appshell':              'area/ui',
  'sidebar':               'area/ui',
  'header':                'area/ui',
  'button':                'area/ui',
  'dropdown':              'area/ui',
  'spinner':               'area/ui',
  'status-badge':          'area/ui',

  // area/types — packages/types: shared Kubernetes resource types.
  'types':                 'area/types',

  // area/tenants — TenantContext, tenant-namespace scoping.
  'tenant':                'area/tenants',
  'tenants':               'area/tenants',

  // area/auth — oauth2-proxy integration, userinfo, cookies.
  'auth':                  'area/auth',
  'oauth':                 'area/auth',
  'oauth2':                'area/auth',
  'oauth2-proxy':          'area/auth',
  'userinfo':              'area/auth',

  // area/vm — VNC console, VM-specific detail tabs.
  'vm':                    'area/vm',
  'vmi':                   'area/vm',
  'vnc':                   'area/vm',
  'kubevirt':              'area/vm',

  // area/container — Containerfile, nginx, image build.
  'container':             'area/container',
  'containerfile':         'area/container',
  'dockerfile':            'area/container',
  'nginx':                 'area/container',
  'image':                 'area/container',

  // area/ci — GitHub Actions workflows, automation.
  'ci':                    'area/ci',
  'workflows':             'area/ci',
  'actions':               'area/ci',

  // area/docs — README, CLAUDE.md, AGENTS.md, contributor docs.
  'docs':                  'area/docs',
  'readme':                'area/docs',
  'claude-md':             'area/docs',
  'agents-md':             'area/docs',

  // area/tests — vitest, jsdom, testing-library wiring.
  'tests':                 'area/tests',
  'test':                  'area/tests',
  'vitest':                'area/tests',
}

// computeLabels returns { add, remove, warnings } given the current PR title,
// body, and existing labels. The set of labels the labeler may remove is
// intentionally narrow — only labels the labeler itself is authoritative for,
// never maintainer-added labels:
//
//   - `area/uncategorized`     — only set as fallback; remove once a real
//                                area/* is derived from the title.
//   - `kind/breaking-change`   — set from the conventional-commit `!` marker
//                                or a `BREAKING CHANGE:` footer; remove when
//                                neither signal is present anymore.
//
// Anything else (maintainer-added `area/*`, manual `kind/*`, anything
// outside these two namespaces) is preserved on every run.
export function computeLabels({ title = '', body = '', existingLabels = [] } = {}) {
  const existing = new Set(existingLabels)
  const toAdd = new Set()

  // 1. Try Conventional Commits form: type(scope)?(!)?: description
  // Inner scope group accepts empty content so that `feat():` still parses
  // as type=feat with no scope (instead of falling through to the bracket
  // form and producing area/uncategorized but also no kind/*).
  const conv = title.match(/^([a-z]+)(?:\(([^)]*)\))?(!)?:\s*.+$/)
  // 2. Fall back to bracket form: [scope] description
  const bracket = !conv && title.match(/^\[([^\]]+)\]\s+.+$/)

  let type = null
  let scopeStr = null
  let breaking = false
  const warnings = []

  if (conv) {
    type = conv[1]
    scopeStr = conv[2] || null
    breaking = !!conv[3]
  } else if (bracket) {
    scopeStr = bracket[1]
  }

  // 3. Detect BREAKING CHANGE: or BREAKING-CHANGE: footer in body.
  // Conventional Commits 1.0 spec item 16 treats them as synonymous.
  if (/^BREAKING[ -]CHANGE:/m.test(body)) {
    breaking = true
  }

  // 4. Apply kind/* from type.
  if (type) {
    if (typeToKind[type]) {
      toAdd.add(typeToKind[type])
    } else {
      warnings.push(`type "${type}" has no kind/* mapping — typo or new type? See .github/scripts/pr-labeler.js typeToKind`)
    }
  }

  // 5. Apply area/* from scope. Composite scopes split on comma.
  const scopes = (scopeStr || '')
    .split(/,\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
  for (const s of scopes) {
    if (scopeToArea[s]) {
      toAdd.add(scopeToArea[s])
    } else {
      warnings.push(`scope "${s}" has no area/* mapping — consider extending scopeToArea in .github/scripts/pr-labeler.js if it recurs`)
    }
  }

  // 6. kind/breaking-change.
  if (breaking) {
    toAdd.add('kind/breaking-change')
  }

  // 7. Fallback: no area/* applied -> area/uncategorized.
  const hasArea = [...toAdd].some((l) => l.startsWith('area/'))
  if (!hasArea) {
    toAdd.add('area/uncategorized')
  }

  // 8. Compute removals — only labels the labeler is authoritative for.
  const toRemove = new Set()
  if (hasArea && existing.has('area/uncategorized')) {
    toRemove.add('area/uncategorized')
  }
  if (!breaking && existing.has('kind/breaking-change')) {
    toRemove.add('kind/breaking-change')
  }

  // 9. Additive over existing.
  const add = [...toAdd].filter((l) => !existing.has(l))
  const remove = [...toRemove]

  return { add, remove, warnings }
}
