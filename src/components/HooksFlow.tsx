'use client'

import { useRef, useState } from 'react'
import {
  AnimatePresence,
  m,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react'
import {
  Check,
  FileCheck2,
  FlaskConical,
  GitCommitHorizontal,
  GitMerge,
  Lock,
  Package,
  RotateCcw,
  ScrollText,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { EASE_OUT, duration, spring } from '@/lib/motion'

/**
 * HooksFlow — explicateur scroll-piloté « ce qu'apportent les hooks ».
 *
 * Le composant est un wrapper haut (≈ 450 vh) contenant un bloc sticky
 * `h-screen`. Le scroll de la page pilote `step` via `useScroll` +
 * `useTransform` — même technique que les animations produit Apple.
 *
 * A11y : `prefers-reduced-motion` → état final composé, aucun timer.
 * Motion : tokens `motion.ts`, `m.*` uniquement (LazyMotion strict).
 */

const VBW = 960
const VBH = 360
const MAIN_Y = 76
const WT_Y = 270
const LAST = 7

// Hauteur totale de scroll : (LAST étapes × 50 vh) + 100 vh fenêtre
const SCROLL_HEIGHT = `${LAST * 50 + 100}vh`

const NODES = {
  start: { x: 96, y: MAIN_Y },
  guard: { x: 176, y: MAIN_Y },
  deps: { x: 304, y: WT_Y },
  config: { x: 432, y: WT_Y },
  build: { x: 560, y: WT_Y },
  tests: { x: 690, y: WT_Y },
  merge: { x: 864, y: MAIN_Y },
} as const

/** Position de la tête de lecture pour chaque temps (0…7). */
const HEAD: Array<[number, number]> = [
  [NODES.start.x, MAIN_Y],
  [NODES.guard.x, MAIN_Y],
  [NODES.deps.x, WT_Y],
  [NODES.deps.x, WT_Y],
  [NODES.config.x, WT_Y],
  [NODES.build.x, WT_Y],
  [NODES.tests.x, WT_Y],
  [NODES.merge.x, MAIN_Y],
]

type Tone = 'neutral' | 'guard' | 'ok'

interface Beat {
  ev: string
  head: string
  sub: string
  hooks: string
  tone: Tone
}

const BEATS: Beat[] = [
  {
    ev: 'UserPromptSubmit',
    head: 'A feature lands on your plate',
    sub: "“Add Stripe checkout.” The agent starts on main — exactly where it shouldn’t.",
    hooks: 'session-start-load-git-context',
    tone: 'neutral',
  },
  {
    ev: 'PreToolUse',
    head: 'Push to main — blocked',
    sub: 'A guardrail fires before the command runs. No accidental push straight to main, ever.',
    hooks: 'pre-bash-guard-git-push-main · pre-write-main-guard',
    tone: 'guard',
  },
  {
    ev: 'SessionStart',
    head: 'Rerouted into an isolated worktree',
    sub: 'Work moves off main automatically. Edits can never leak back into your repo.',
    hooks: 'session-start-worktree-if-main · pre-edit-worktree-guard',
    tone: 'neutral',
  },
  {
    ev: 'SessionStart',
    head: 'Dependencies ready — automatically',
    sub: 'The fresh worktree runs pnpm install on its own. No "works on my machine".',
    hooks: 'worktree-create-update-deps · setup-install-deps',
    tone: 'neutral',
  },
  {
    ev: 'UserPromptSubmit',
    head: 'Your conventions, injected',
    sub: 'Project rules, git state and AGENTS.md are loaded in. The agent codes like a teammate.',
    hooks: 'user-prompt-inject-conventions · session-start-agents-md',
    tone: 'neutral',
  },
  {
    ev: 'PostToolUse',
    head: 'Every file: formatted · linted · typed',
    sub: 'Each save is auto-fixed in the same loop — and a leaked API key is caught before it lands.',
    hooks: 'post-write-autoformat · post-write-biome · post-edit-typecheck · pre-write-secret-detection',
    tone: 'neutral',
  },
  {
    ev: 'Stop',
    head: "It won't hand back until tests are green",
    sub: 'The session is gated on a passing suite. No red build slips through to you.',
    hooks: 'stop-run-tests · stop-quality-check',
    tone: 'ok',
  },
  {
    ev: 'merge',
    head: 'Shipped to main — safe & tested',
    sub: 'Formatted, linted, typed, tested, off-main the whole way. Zero babysitting.',
    hooks: 'The full stack, working while you watch',
    tone: 'ok',
  },
]

/** Repères fixes posés sous chaque nœud du graphe. */
const MARKERS = [
  { key: 'start', icon: GitCommitHorizontal, label: 'prompt', at: 0 },
  { key: 'guard', icon: ShieldCheck, label: 'guard', at: 1 },
  { key: 'deps', icon: Package, label: 'install', at: 3 },
  { key: 'config', icon: ScrollText, label: 'context', at: 4 },
  { key: 'build', icon: FileCheck2, label: 'quality', at: 5 },
  { key: 'tests', icon: FlaskConical, label: 'tests', at: 6 },
  { key: 'merge', icon: GitMerge, label: 'ship', at: 7 },
] as const

const TONE_TEXT: Record<Tone, string> = {
  neutral: 'text-white',
  guard: 'text-amber-300',
  ok: 'text-emerald-300',
}
const TONE_RING: Record<Tone, string> = {
  neutral: 'ring-white/20',
  guard: 'ring-amber-500/40',
  ok: 'ring-emerald-500/40',
}

const pct = (v: number, total: number) => `${(v / total) * 100}%`

export function HooksFlow() {
  const reduce = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(0)

  // Scroll de la page → progression dans les étapes
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })
  const stepRaw = useTransform(scrollYProgress, [0, 1], [0, LAST])

  useMotionValueEvent(stepRaw, 'change', (v) => {
    if (!reduce) setStep(Math.min(LAST, Math.max(0, Math.round(v))))
  })

  // prefers-reduced-motion → état final composé, sans scroll
  const s = reduce ? LAST : step

  // Scrolle vers l'étape i (clic sur un point de progression)
  const scrollToStep = (i: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const scrollable = containerRef.current.offsetHeight - window.innerHeight
    const target = window.scrollY + rect.top + (i / LAST) * scrollable
    window.scrollTo({ top: target, behavior: 'smooth' })
  }

  const beat = BEATS[Math.min(s, LAST)]
  const [hx, hy] = HEAD[Math.min(s, LAST)]
  const headTone =
    beat.tone === 'guard'
      ? 'var(--color-amber, #fbbf24)'
      : beat.tone === 'ok'
        ? '#34d399'
        : '#ffffff'

  return (
    // Wrapper haut : fournit la zone scrollable qui pilote l'animation
    <div
      ref={containerRef}
      data-component="HooksFlow"
      style={{ height: SCROLL_HEIGHT }}
    >
      {/* Bloc sticky : reste à l'écran pendant tout le scroll */}
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center py-8">
        <div className="mx-auto w-full max-w-5xl px-4">

          {/* Intro */}
          <div className="mb-8 text-center">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-zinc-500">
              <Sparkles className="size-3.5" aria-hidden /> What hooks actually do
            </p>
            <h2 className="mx-auto mt-3 max-w-2xl text-balance text-2xl font-bold text-white sm:text-3xl">
              Watch your hooks ship a feature
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm leading-relaxed text-zinc-400 sm:text-base">
              Hooks fire on the agent's lifecycle — guardrails{' '}
              <em className="not-italic text-zinc-300">before</em> risky actions, automation{' '}
              <em className="not-italic text-zinc-300">after</em>. Scroll through one feature
              shipping under their watch.
            </p>
          </div>

          {/* Le graphe — scrollable sur mobile (trop dense en dessous de sm) */}
          <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:overflow-visible sm:px-0">
            <div
              className="relative w-full min-w-[680px] sm:min-w-0"
              style={{ aspectRatio: `${VBW} / ${VBH}` }}
            >
              <svg
                viewBox={`0 0 ${VBW} ${VBH}`}
                className="absolute inset-0 h-full w-full overflow-visible"
                aria-hidden
              >
                {/* main — segment amont (solide) */}
                <line x1={24} y1={MAIN_Y} x2={NODES.guard.x} y2={MAIN_Y} stroke="#3a3a3a" strokeWidth={3} strokeLinecap="round" />

                {/* main — chemin direct INTERDIT (pointillé, vire à l'amber au blocage) */}
                <m.line
                  x1={NODES.guard.x}
                  y1={MAIN_Y}
                  x2={NODES.merge.x}
                  y2={MAIN_Y}
                  strokeWidth={2}
                  strokeDasharray="2 9"
                  strokeLinecap="round"
                  initial={false}
                  animate={{ stroke: s >= 1 ? 'rgba(251,191,36,0.45)' : '#272727' }}
                  transition={{ duration: duration.base }}
                />

                {/* embranchement main → worktree */}
                <m.path
                  d={`M${NODES.guard.x} ${MAIN_Y} C ${NODES.guard.x + 34} ${MAIN_Y}, ${NODES.deps.x - 90} ${WT_Y}, ${NODES.deps.x - 64} ${WT_Y}`}
                  fill="none"
                  stroke="#e7e7e7"
                  strokeWidth={3}
                  strokeLinecap="round"
                  initial={false}
                  animate={{ pathLength: s >= 2 ? 1 : 0, opacity: s >= 2 ? 1 : 0 }}
                  transition={{ duration: duration.reveal, ease: EASE_OUT }}
                />

                {/* ligne du worktree */}
                <m.line
                  x1={NODES.deps.x - 64}
                  y1={WT_Y}
                  x2={NODES.tests.x + 30}
                  y2={WT_Y}
                  stroke="#e7e7e7"
                  strokeWidth={3}
                  strokeLinecap="round"
                  initial={false}
                  animate={{ pathLength: s >= 2 ? 1 : 0, opacity: s >= 2 ? 1 : 0 }}
                  transition={{ duration: duration.reveal, ease: EASE_OUT }}
                />

                {/* merge worktree → main */}
                <m.path
                  d={`M${NODES.tests.x + 30} ${WT_Y} C ${NODES.merge.x - 56} ${WT_Y}, ${NODES.merge.x - 40} ${MAIN_Y}, ${NODES.merge.x} ${MAIN_Y}`}
                  fill="none"
                  stroke="#34d399"
                  strokeWidth={3}
                  strokeLinecap="round"
                  initial={false}
                  animate={{ pathLength: s >= 7 ? 1 : 0, opacity: s >= 7 ? 1 : 0 }}
                  transition={{ duration: duration.reveal, ease: EASE_OUT }}
                />

                {/* main — aval, après le merge */}
                <m.line
                  x1={NODES.merge.x}
                  y1={MAIN_Y}
                  x2={936}
                  y2={MAIN_Y}
                  stroke="#34d399"
                  strokeWidth={3}
                  strokeLinecap="round"
                  initial={false}
                  animate={{ opacity: s >= 7 ? 1 : 0 }}
                  transition={{ duration: duration.base }}
                />

                {/* labels de voie */}
                <text x={24} y={MAIN_Y - 18} className="fill-zinc-500 font-mono text-[13px]">
                  main
                </text>
                <m.text
                  x={NODES.deps.x - 64}
                  y={WT_Y + 30}
                  className="fill-zinc-500 font-mono text-[13px]"
                  initial={false}
                  animate={{ opacity: s >= 2 ? 1 : 0 }}
                  transition={{ duration: duration.base }}
                >
                  worktree
                </m.text>

                {/* nœuds (commits) */}
                {MARKERS.map((mk) => {
                  const n = NODES[mk.key]
                  const on = s >= mk.at
                  const current = s === mk.at
                  const accent =
                    mk.key === 'guard' ? '#fbbf24' : mk.key === 'merge' ? '#34d399' : '#ffffff'
                  return (
                    <g key={mk.key}>
                      {/* halo */}
                      <m.circle
                        cx={n.x}
                        cy={n.y}
                        r={16}
                        fill={accent}
                        initial={false}
                        animate={{ opacity: current ? 0.16 : 0, scale: current ? 1 : 0.4 }}
                        style={{ transformOrigin: `${n.x}px ${n.y}px` }}
                        transition={spring.smooth}
                      />
                      <m.circle
                        cx={n.x}
                        cy={n.y}
                        r={6.5}
                        initial={false}
                        animate={{
                          fill: on ? accent : '#141414',
                          stroke: on ? accent : '#3a3a3a',
                          scale: on ? 1 : 0.78,
                        }}
                        strokeWidth={2.5}
                        style={{ transformOrigin: `${n.x}px ${n.y}px` }}
                        transition={spring.snappy}
                      />
                    </g>
                  )
                })}

                {/* tête de lecture */}
                <m.g
                  initial={false}
                  animate={{ x: hx, y: hy }}
                  transition={{ ...spring.smooth, stiffness: 220, damping: 26 }}
                >
                  <m.circle
                    r={13}
                    fill={headTone}
                    initial={false}
                    animate={{ opacity: [0.12, 0.28, 0.12], scale: [0.9, 1.15, 0.9] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <circle r={4.5} fill={headTone} />
                </m.g>
              </svg>

              {/* repères texte sous les nœuds (overlay HTML, alignés sur le viewBox) */}
              {MARKERS.map((mk) => {
                const n = NODES[mk.key]
                const on = s >= mk.at
                const below = n.y === WT_Y
                const Icon = mk.icon
                return (
                  <m.div
                    key={mk.key}
                    className="pointer-events-none absolute flex w-16 -translate-x-1/2 flex-col items-center gap-1 sm:w-24"
                    style={{
                      left: pct(n.x, VBW),
                      top: pct(below ? n.y + 30 : n.y - 64, VBH),
                    }}
                    initial={false}
                    animate={{ opacity: on ? 1 : 0.32, y: 0 }}
                    transition={{ duration: duration.base, ease: EASE_OUT }}
                  >
                    <Icon
                      className={`size-4 ${on ? (mk.key === 'guard' ? 'text-amber-300' : mk.key === 'merge' ? 'text-emerald-300' : 'text-white') : 'text-zinc-600'}`}
                      aria-hidden
                    />
                    <span className={`font-mono text-[11px] ${on ? 'text-zinc-300' : 'text-zinc-600'}`}>
                      {mk.label}
                    </span>
                  </m.div>
                )
              })}
            </div>
          </div>

          {/* Spotlight — le bénéfice du temps courant */}
          <div className="relative mt-6 min-h-[148px] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
            <AnimatePresence mode="wait">
              <m.div
                key={s}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: duration.base, ease: EASE_OUT }}
                className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[11px] ring-1 ${TONE_RING[beat.tone]} ${TONE_TEXT[beat.tone]}`}
                  >
                    {beat.ev}
                  </span>
                  <h3 className="mt-3 text-lg font-semibold text-white sm:text-xl">{beat.head}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{beat.sub}</p>
                  <p className="mt-3 font-mono text-[11px] leading-relaxed text-zinc-600">{beat.hooks}</p>
                </div>
                <Proof step={s} />
              </m.div>
            </AnimatePresence>
          </div>

          {/* Progress + retour au début */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {BEATS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Étape ${i + 1}`}
                  onClick={() => scrollToStep(i)}
                  className="group p-1"
                >
                  <span
                    className={`block h-1.5 rounded-full transition-all ${i === s ? 'w-6 bg-white' : i < s ? 'w-1.5 bg-zinc-500' : 'w-1.5 bg-zinc-700 group-hover:bg-zinc-500'}`}
                  />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => scrollToStep(0)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-600 hover:text-white"
            >
              <RotateCcw className="size-3.5" aria-hidden /> Back to start
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

/** Mini-visuels de « preuve » affichés dans le spotlight, un par temps. */
function Proof({ step }: { step: number }) {
  const box = 'flex h-[88px] w-full items-center justify-center rounded-xl bg-[var(--color-surface-2)] px-4 ring-1 ring-inset ring-white/5 sm:w-64'

  if (step === 1) {
    return (
      <div className={box}>
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="size-5 shrink-0 text-amber-300" aria-hidden />
          <code className="font-mono text-xs text-zinc-500 line-through decoration-amber-400/70">
            git push origin main
          </code>
        </div>
      </div>
    )
  }

  if (step === 3) {
    return (
      <div className={box}>
        <div className="w-full">
          <div className="mb-2 flex items-center justify-between font-mono text-[11px] text-zinc-400">
            <span>pnpm install</span>
            <span className="text-emerald-300">done</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <m.div
              className="h-full rounded-full bg-white"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              style={{ transformOrigin: 'left' }}
              transition={{ duration: 0.9, ease: EASE_OUT }}
            />
          </div>
          <p className="mt-2 font-mono text-[11px] text-zinc-600">node_modules ready</p>
        </div>
      </div>
    )
  }

  if (step === 4) {
    const chips = ['conventions', 'git context', 'AGENTS.md']
    return (
      <div className={box}>
        <div className="flex flex-wrap justify-center gap-1.5">
          {chips.map((c, i) => (
            <m.span
              key={c}
              className="rounded-full bg-white/10 px-2.5 py-1 font-mono text-[11px] text-zinc-300"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...spring.snappy, delay: i * 0.12 }}
            >
              {c}
            </m.span>
          ))}
        </div>
      </div>
    )
  }

  if (step === 5) {
    const files = ['checkout.ts', 'stripe.ts']
    return (
      <div className={box}>
        <ul className="w-full space-y-1.5">
          {files.map((f, i) => (
            <m.li
              key={f}
              className="flex items-center gap-2 font-mono text-[11px] text-zinc-300"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...spring.snappy, delay: i * 0.14 }}
            >
              <Check className="size-3.5 text-emerald-300" aria-hidden /> {f}
            </m.li>
          ))}
          <m.li
            className="flex items-center gap-2 font-mono text-[11px] text-amber-300/90"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...spring.snappy, delay: 0.34 }}
          >
            <Lock className="size-3.5 shrink-0" aria-hidden /> sk_live_… blocked
          </m.li>
        </ul>
      </div>
    )
  }

  if (step === 6) {
    return (
      <div className={box}>
        <div className="w-full">
          <div className="mb-2 flex items-center justify-center gap-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <m.span
                key={i}
                className="size-2.5 rounded-full bg-emerald-400"
                initial={{ opacity: 0.15, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...spring.snappy, delay: i * 0.1 }}
              />
            ))}
          </div>
          <p className="text-center font-mono text-[11px] text-emerald-300">✓ 18 passed</p>
        </div>
      </div>
    )
  }

  if (step === 7) {
    return (
      <div className={box}>
        <m.div
          className="flex items-center gap-2.5 text-emerald-300"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={spring.smooth}
        >
          <GitMerge className="size-6" aria-hidden />
          <span className="font-mono text-sm">merged → main</span>
        </m.div>
      </div>
    )
  }

  // step 0 — le prompt
  return (
    <div className={box}>
      <div className="rounded-xl bg-white/5 px-3 py-2">
        <p className="font-mono text-[11px] text-zinc-300">"Add Stripe checkout"</p>
      </div>
    </div>
  )
}
