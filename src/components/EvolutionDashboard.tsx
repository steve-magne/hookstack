'use client'

// EvolutionDashboard — la page /evolution. Épurée pour focaliser sur la courbe
// d'évolution : « Evolution Hooks proposed » (temps en X, nombre de hooks en Y),
// suivie des derniers hooks ajoutés. Motion via le langage unique (m.* + tokens
// src/lib/motion.ts). A11y gérée globalement par MotionConfig.

import Link from 'next/link'
import { m } from 'motion/react'
import { cumulativeSeries, recentHooks, timeline } from '@/lib/timeline'
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/types/hook'
import { fadeUp, staggerContainer, spring, EASE_OUT, duration } from '@/lib/motion'

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function EvolutionDashboard() {
  const series = cumulativeSeries()
  const recent = recentHooks(8)

  return (
    <m.div
      data-component="EvolutionDashboard"
      className="mx-auto max-w-5xl px-4 py-12"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {/* Hero */}
      <m.header variants={fadeUp} className="mb-10">
        <p className="mb-2 text-sm font-medium uppercase tracking-wide text-[var(--color-brand)]">
          Built in the open
        </p>
        <h1 className="mb-3 text-3xl font-bold text-white sm:text-4xl">
          The stack grows, one hook at a time
        </h1>
        <p className="max-w-2xl text-lg text-zinc-400">
          Every hook in the catalogue is dogfooded on this very repository, unit-tested, and shipped
          in public. Here is the whole journey — pulled straight from git history, never hand-edited.
        </p>
      </m.header>

      {/* Evolution curve */}
      <m.section
        variants={fadeUp}
        className="mb-10 rounded-xl border border-[var(--color-border)] bg-[#0d0d14] p-5"
      >
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-white">Evolution Hooks proposed</h2>
          <span className="text-xs text-zinc-500">
            {fmtDate(timeline.firstDate)} → {fmtDate(timeline.lastDate)}
          </span>
        </div>
        <GrowthCurve series={series} total={timeline.total} />
      </m.section>

      {/* Recent additions */}
      <m.section variants={fadeUp} className="mb-4">
        <h2 className="mb-4 text-lg font-semibold text-white">Latest additions</h2>
        <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[#0d0d14]">
          {recent.map((h) => (
            <li key={h.slug}>
              <Link
                href={`/hook/${h.slug}`}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-white">{h.name}</div>
                  <div className="mt-0.5 text-xs text-zinc-500">{fmtDate(h.date)}</div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${CATEGORY_COLORS[h.category]}`}
                >
                  {CATEGORY_LABELS[h.category]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </m.section>

      {/* CTA */}
      <m.div variants={fadeUp} className="flex flex-wrap gap-4 text-sm">
        <Link href="/" className="text-[var(--color-brand)] hover:underline">
          Browse the full catalogue →
        </Link>
        <a
          href="https://github.com/steve-magne/hookstack"
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-400 hover:text-white"
        >
          Add a hook on GitHub
        </a>
      </m.div>
    </m.div>
  )
}

// Courbe d'évolution — X = temps (échelle réelle par date), Y = nombre cumulé de
// hooks. Area + ligne révélée au pathLength, axes + graduations monochromes.
function GrowthCurve({
  series,
  total,
}: {
  series: { date: string; cumulative: number }[]
  total: number
}) {
  if (series.length < 2) {
    return <p className="text-sm text-zinc-500">Not enough history yet — check back soon.</p>
  }

  const W = 720
  const H = 280
  const M = { top: 14, right: 16, bottom: 36, left: 44 }
  const innerW = W - M.left - M.right
  const innerH = H - M.top - M.bottom

  // Échelle X temporelle : position proportionnelle à la date réelle (pas l'index),
  // pour que les écarts entre jours reflètent le vrai temps écoulé.
  const t = (iso: string) => new Date(`${iso}T00:00:00Z`).getTime()
  const tMin = t(series[0].date)
  const tMax = t(series[series.length - 1].date)
  const tSpan = tMax - tMin || 1
  const x = (iso: string) => M.left + ((t(iso) - tMin) / tSpan) * innerW

  // Échelle Y : 0 → total (nombre de hooks).
  const yMax = total || 1
  const y = (v: number) => M.top + innerH - (v / yMax) * innerH

  const linePath = series
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.date).toFixed(1)} ${y(p.cumulative).toFixed(1)}`)
    .join(' ')
  const areaPath = `${linePath} L ${(M.left + innerW).toFixed(1)} ${M.top + innerH} L ${M.left} ${M.top + innerH} Z`

  // Graduations Y : 5 paliers entiers répartis sur [0, yMax].
  const yTicks = Array.from({ length: 5 }, (_, i) => Math.round((yMax * i) / 4))
  // Graduations X : ~5 dates réparties dans le temps (libellé mois + jour).
  const xTickCount = Math.min(5, series.length)
  const xTicks = Array.from({ length: xTickCount }, (_, i) => {
    const time = tMin + (tSpan * i) / (xTickCount - 1 || 1)
    return new Date(time).toISOString().slice(0, 10)
  })
  const fmtTick = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label={`Cumulative hooks proposed over time, reaching ${total}`}
    >
      <defs>
        <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grille + axe Y (nombre de hooks) */}
      {yTicks.map((v) => (
        <g key={`y-${v}`}>
          <line
            x1={M.left}
            y1={y(v)}
            x2={M.left + innerW}
            y2={y(v)}
            stroke="var(--color-border)"
            strokeWidth={1}
            strokeOpacity={v === 0 ? 0.9 : 0.35}
          />
          <text x={M.left - 8} y={y(v) + 3} textAnchor="end" fill="#71717a" fontSize="11">
            {v}
          </text>
        </g>
      ))}
      {/* Libellé d'axe Y */}
      <text
        x={12}
        y={M.top + innerH / 2}
        fill="#a1a1aa"
        fontSize="11"
        textAnchor="middle"
        transform={`rotate(-90 12 ${M.top + innerH / 2})`}
      >
        Hooks
      </text>

      {/* Axe X (temps) */}
      {xTicks.map((iso, i) => (
        <text
          // biome-ignore lint/suspicious/noArrayIndexKey: iso can collide on short timelines, i keeps ticks unique; list is computed fresh and never reorders
          key={`x-${iso}-${i}`}
          x={x(iso)}
          y={H - 14}
          textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}
          fill="#71717a"
          fontSize="11"
        >
          {fmtTick(iso)}
        </text>
      ))}
      <text x={M.left + innerW / 2} y={H - 1} fill="#a1a1aa" fontSize="11" textAnchor="middle">
        Time
      </text>

      {/* Aire + courbe */}
      <m.path
        d={areaPath}
        fill="url(#growthFill)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: duration.reveal }}
      />
      <m.path
        d={linePath}
        fill="none"
        stroke="var(--color-brand)"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, ease: EASE_OUT }}
      />
      {series.map((p, i) => (
        <m.circle
          key={p.date}
          cx={x(p.date)}
          cy={y(p.cumulative)}
          r={3}
          fill="var(--color-brand)"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 + (i / series.length) * 0.8, ...spring.snappy }}
        >
          <title>{`${p.cumulative} hooks by ${fmtDate(p.date)}`}</title>
        </m.circle>
      ))}
    </svg>
  )
}
