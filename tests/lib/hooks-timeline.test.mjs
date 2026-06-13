import { describe, it, expect, vi } from 'vitest'
import {
  gitCreationDate,
  collectHooks,
  buildTimeline,
  bucketLevel,
  buildWeeks,
  renderHeatmapSvg,
  renderLinechartSvg,
  renderReadmeBlock,
  injectReadme,
} from '../../.claude/hooks-timeline.mjs'

const REGISTRY = [
  { slug: 'secret-detection', name: 'Secret detection', category: 'security', implementation: { script_path: '.claude/hooks/detect-secrets.mjs' } },
  { slug: 'load-git-context', name: 'Load git context', category: 'context', implementation: { script_path: '.claude/hooks/git-context.mjs' } },
]

describe('gitCreationDate', () => {
  it('returns the date of the earliest (last-listed) add commit', () => {
    const exec = vi.fn(() => '2026-06-10T09:00:00-03:00\n2026-05-29T14:00:00-03:00\n')
    expect(gitCreationDate('.claude/hooks/x.mjs', exec)).toBe('2026-05-29')
  })

  it('returns null for an uncommitted file (empty output)', () => {
    expect(gitCreationDate('.claude/hooks/new.mjs', () => '')).toBeNull()
  })

  it('returns null when git throws', () => {
    expect(gitCreationDate('.claude/hooks/x.mjs', () => { throw new Error('not a repo') })).toBeNull()
  })
})

describe('collectHooks', () => {
  it('enriches files from the registry, skips undated, sorts by date then name', () => {
    const dates = {
      'detect-secrets.mjs': '2026-05-31',
      'git-context.mjs': '2026-05-29',
      'orphan.mjs': '2026-06-01',
      'uncommitted.mjs': null,
    }
    const exec = (cmd) => {
      const file = cmd.match(/hooks\/([\w.-]+)"/)[1]
      const d = dates[file]
      return d ? `${d}T10:00:00Z\n` : ''
    }
    const entries = collectHooks({
      files: ['detect-secrets.mjs', 'git-context.mjs', 'orphan.mjs', 'uncommitted.mjs'],
      registry: REGISTRY,
      exec,
    })
    expect(entries.map((e) => e.slug)).toEqual(['load-git-context', 'secret-detection', 'orphan'])
    // orphan has no registry entry → slug derived from filename, default category
    expect(entries[2]).toMatchObject({ slug: 'orphan', name: 'orphan', category: 'workflow' })
  })
})

describe('buildTimeline', () => {
  it('aggregates counts per day and reports span', () => {
    const t = buildTimeline([
      { slug: 'a', name: 'A', category: 'security', date: '2026-05-29' },
      { slug: 'b', name: 'B', category: 'context', date: '2026-05-29' },
      { slug: 'c', name: 'C', category: 'workflow', date: '2026-06-01' },
    ])
    expect(t.total).toBe(3)
    expect(t.firstDate).toBe('2026-05-29')
    expect(t.lastDate).toBe('2026-06-01')
    expect(t.byDay).toEqual({ '2026-05-29': 2, '2026-06-01': 1 })
  })

  it('handles an empty catalogue', () => {
    const t = buildTimeline([])
    expect(t).toMatchObject({ total: 0, firstDate: null, lastDate: null, byDay: {} })
  })
})

describe('bucketLevel', () => {
  it('maps counts to GitHub-like intensity levels', () => {
    expect([0, 1, 2, 5, 10, 28].map(bucketLevel)).toEqual([0, 1, 1, 2, 3, 4])
  })
})

describe('buildWeeks', () => {
  const timeline = buildTimeline([
    { slug: 'a', name: 'A', category: 'security', date: '2026-05-29' },
    { slug: 'b', name: 'B', category: 'context', date: '2026-06-01' },
  ])

  it('produces 7-day columns starting on Sunday, carrying counts', () => {
    const weeks = buildWeeks(timeline, 1)
    expect(weeks.every((w) => w.length === 7)).toBe(true)
    expect(new Date(`${weeks[0][0].date}T00:00:00Z`).getUTCDay()).toBe(0)
    const may29 = weeks.flat().find((d) => d.date === '2026-05-29')
    expect(may29).toMatchObject({ count: 1, level: 1 })
  })

  it('pads forward to guarantee a minimum width (room to grow)', () => {
    expect(buildWeeks(timeline, 20).length).toBe(20)
  })

  it('returns no weeks for an empty timeline', () => {
    expect(buildWeeks(buildTimeline([]))).toEqual([])
  })
})

describe('renderHeatmapSvg', () => {
  const svg = renderHeatmapSvg(
    buildTimeline([{ slug: 'a', name: 'A', category: 'security', date: '2026-05-29' }]),
  )
  it('is a self-contained svg with a legend and an accessible label', () => {
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).toContain('role="img"')
    expect(svg).toContain('aria-label="HookStack — 1 hooks added since 2026-05-29"')
    expect(svg).toContain('>Less</text>')
    expect(svg).toContain('>More</text>')
  })
  it('encodes the day count in a <title> for hover tooltips', () => {
    expect(svg).toContain('2026-05-29 — 1 hook added')
  })
})

describe('renderLinechartSvg', () => {
  const entries = [
    { slug: 'a', name: 'A', category: 'security', date: '2026-05-29' },
    { slug: 'b', name: 'B', category: 'workflow', date: '2026-06-01' },
    { slug: 'c', name: 'C', category: 'workflow', date: '2026-06-01' },
  ]
  const svg = renderLinechartSvg(buildTimeline(entries))

  it('is a self-contained accessible SVG', () => {
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).toContain('role="img"')
    expect(svg).toContain('aria-label="HookStack evolution — 3 hooks since 2026-05-29"')
  })
  it('draws a polyline (the cumulative line)', () => {
    expect(svg).toContain('<polyline')
  })
  it('draws dots at active days', () => {
    expect(svg).toContain('<circle')
  })
  it('returns an empty-state svg when timeline is empty', () => {
    const empty = renderLinechartSvg(buildTimeline([]))
    expect(empty).toContain('No hooks yet')
  })
})

describe('injectReadme', () => {
  const block = renderReadmeBlock(
    buildTimeline([{ slug: 'a', name: 'A', category: 'security', date: '2026-05-29' }]),
  )

  it('inserts the block before the first heading on first run', () => {
    const out = injectReadme('# Title\n\nIntro\n\n## Promise\n\nbody\n', block)
    expect(out).toContain('<!-- HOOKS_TIMELINE:START -->')
    expect(out.indexOf('HOOKS_TIMELINE:START')).toBeLessThan(out.indexOf('## Promise'))
  })

  it('replaces an existing block in place (idempotent shape)', () => {
    const first = injectReadme('# T\n\n## Promise\n\nbody\n', block)
    const second = injectReadme(first, block)
    expect(second).toBe(first)
    expect((second.match(/HOOKS_TIMELINE:START/g) || []).length).toBe(1)
  })
})
