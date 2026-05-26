import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeLabels } from './pr-labeler.js'

test('conventional commit type → kind/*', () => {
  const { add } = computeLabels({ title: 'feat(console): add foo' })
  assert.ok(add.includes('kind/feature'))
  assert.ok(add.includes('area/console'))
})

test('scope maps to area/*', () => {
  const { add } = computeLabels({ title: 'fix(backup): cleanup' })
  assert.ok(add.includes('kind/bug'))
  assert.ok(add.includes('area/forms'))
})

test('composite scope splits on comma', () => {
  const { add } = computeLabels({ title: 'feat(ui, forms): combo' })
  assert.ok(add.includes('area/ui'))
  assert.ok(add.includes('area/forms'))
})

test('bracket form: [scope] description', () => {
  const { add } = computeLabels({ title: '[ci] tweak workflow' })
  assert.ok(add.includes('area/ci'))
})

test('no scope → area/uncategorized fallback', () => {
  const { add } = computeLabels({ title: 'chore: housekeeping' })
  assert.ok(add.includes('kind/cleanup'))
  assert.ok(add.includes('area/uncategorized'))
})

test('breaking change via ! marker', () => {
  const { add } = computeLabels({ title: 'feat(api)!: drop legacy' })
  assert.ok(add.includes('kind/breaking-change'))
})

test('breaking change via BREAKING CHANGE: body footer', () => {
  const { add } = computeLabels({
    title: 'feat(api): refactor',
    body: 'Some description\n\nBREAKING CHANGE: removed old endpoint',
  })
  assert.ok(add.includes('kind/breaking-change'))
})

test('breaking change via BREAKING-CHANGE: footer (Conventional Commits 1.0 #16)', () => {
  const { add } = computeLabels({
    title: 'feat: x',
    body: 'BREAKING-CHANGE: synonymous spelling',
  })
  assert.ok(add.includes('kind/breaking-change'))
})

test('unknown type emits warning, no kind/*', () => {
  const { add, warnings } = computeLabels({ title: 'wat(ui): mystery type' })
  assert.ok(!add.some((l) => l.startsWith('kind/')))
  assert.ok(warnings.some((w) => w.includes('"wat"')))
})

test('unknown scope emits warning, falls back to area/uncategorized', () => {
  const { add, warnings } = computeLabels({ title: 'feat(unknown-scope): x' })
  assert.ok(add.includes('area/uncategorized'))
  assert.ok(warnings.some((w) => w.includes('"unknown-scope"')))
})

test('additive only — already-present labels not re-added', () => {
  const { add } = computeLabels({
    title: 'feat(console): existing',
    existingLabels: ['kind/feature', 'area/console'],
  })
  assert.deepEqual(add, [])
})

// ── Stale-label removal tests (the regression that triggered the rewrite) ──

test('retitle: chore: foo → chore(ci): foo strips area/uncategorized', () => {
  const { add, remove } = computeLabels({
    title: 'chore(ci): pin pnpm',
    existingLabels: ['kind/cleanup', 'area/uncategorized'],
  })
  assert.ok(add.includes('area/ci'))
  assert.ok(remove.includes('area/uncategorized'))
})

test('retitle: real scope added — maintainer-added area/* is preserved', () => {
  // Maintainer added area/forms manually; title later gains area/ci. Both
  // legitimately apply (the change touches both areas) so neither is removed.
  const { add, remove } = computeLabels({
    title: 'chore(ci): bump workflow',
    existingLabels: ['area/forms'],
  })
  assert.ok(add.includes('area/ci'))
  assert.ok(!remove.includes('area/forms'))
})

test('retitle: feat!: x → feat: x strips kind/breaking-change', () => {
  const { remove } = computeLabels({
    title: 'feat(api): refactor',
    body: '',
    existingLabels: ['kind/feature', 'area/uncategorized', 'kind/breaking-change'],
  })
  assert.ok(remove.includes('kind/breaking-change'))
})

test('retitle: still breaking — kind/breaking-change preserved', () => {
  const { add, remove } = computeLabels({
    title: 'feat(api)!: still breaking',
    existingLabels: ['kind/breaking-change'],
  })
  assert.ok(!remove.includes('kind/breaking-change'))
  // Already present, not re-added.
  assert.ok(!add.includes('kind/breaking-change'))
})

test('retitle does not strip area/uncategorized while still uncategorized', () => {
  // Title has no scope — area/uncategorized is still the right state.
  const { add, remove } = computeLabels({
    title: 'chore: housekeeping',
    existingLabels: ['kind/cleanup', 'area/uncategorized'],
  })
  assert.ok(!remove.includes('area/uncategorized'))
  assert.deepEqual(add, [])
})

test('plural scope: feat(backups) maps to area/forms', () => {
  const { add } = computeLabels({ title: 'feat(backups): polish' })
  assert.ok(add.includes('area/forms'))
})

test('overview scope maps to area/console', () => {
  const { add } = computeLabels({ title: 'style(overview): tweak layout' })
  assert.ok(add.includes('area/console'))
})

test('vmdisk (no hyphen) maps to area/forms', () => {
  const { add } = computeLabels({ title: 'fix(vmdisk): reorder' })
  assert.ok(add.includes('area/forms'))
})

test('empty parens: feat(): x parses as type=feat, scope=empty', () => {
  const { add, warnings } = computeLabels({ title: 'feat(): bare description' })
  assert.ok(add.includes('kind/feature'))
  assert.ok(add.includes('area/uncategorized'))
  assert.deepEqual(warnings, [])
})

test('non-labeler labels are never removed', () => {
  // The labeler must never touch labels outside its authoritative set
  // (area/uncategorized, kind/breaking-change). Maintainer-added kind/*,
  // priority/*, triage/*, lifecycle/*, etc. survive untouched.
  const { remove } = computeLabels({
    title: 'fix(forms): regression',
    existingLabels: [
      'kind/feature',         // wrong kind, but not the labeler's call to fix
      'priority/important-soon',
      'lifecycle/active',
      'area/forms',
    ],
  })
  assert.deepEqual(remove, [])
})
