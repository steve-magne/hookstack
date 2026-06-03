'use client'

import { useEffect, useMemo, useRef } from 'react'
import { m, useAnimationControls } from 'motion/react'
import { InstallCommand } from './InstallCommand'
import { allHooks } from '@/lib/hooks'
import { useT } from '@/lib/locale-context'
import { useSelection } from '@/store/selection'

const DEFAULT_MOBILE_PROMPT =
  'Please run `npx hookstack-cli@latest install` in the root of the current project. This will install the recommended production-ready Claude Code hooks from HookStack into .claude/hooks/ and patch settings.json.'

export function StickyInstallBanner() {
  const T = useT()
  const initMust = useSelection((s) => s.initMust)
  const selectedSlugs = useSelection((s) => s.selected)
  const sessionTouched = useSelection((s) => s.sessionTouched)
  const selectedCount = selectedSlugs.length

  const mustSlugs = useMemo(
    () => allHooks.filter((h) => h.is_must).map((h) => h.slug),
    []
  )

  useEffect(() => {
    initMust(mustSlugs)
  }, [initMust, mustSlugs])

  // Court tant que l'utilisateur n'a pas touché la sélection dans cette session.
  const installCmd = useMemo(() => {
    if (!sessionTouched) return 'npx hookstack-cli@latest install'
    return `npx hookstack-cli@latest install --hooks=${allHooks
      .filter((h) => selectedSlugs.includes(h.slug))
      .map((h) => h.slug)
      .join(',')}`
  }, [sessionTouched, selectedSlugs])

  const mobilePrompt = sessionTouched
    ? `Please run \`${installCmd}\` in the root of the current project. This installs your selected Claude Code hooks from HookStack into .claude/hooks/ and patches settings.json.`
    : DEFAULT_MOBILE_PROMPT

  // Pulse quand la sélection change — garde 800ms pour ignorer l'init.
  const ringControls = useAnimationControls()
  const countControls = useAnimationControls()
  const prevCount = useRef(selectedCount)
  const pulseReady = useRef(false)
  useEffect(() => {
    const t = setTimeout(() => { pulseReady.current = true }, 800)
    return () => clearTimeout(t)
  }, [])
  useEffect(() => {
    if (!pulseReady.current) { prevCount.current = selectedCount; return }
    if (selectedCount !== prevCount.current) {
      ringControls.start({ opacity: [0, 1, 0], transition: { duration: 0.7, ease: 'easeOut' } })
      countControls.start({ scale: [1, 1.35, 1], transition: { duration: 0.35, ease: 'easeOut' } })
      prevCount.current = selectedCount
    }
  }, [selectedCount, ringControls, countControls])

  return (
    <div data-component="StickyInstallBanner" className="sticky top-3 z-30 bg-[#0a0a0a] [box-shadow:0_-12px_0_0_#0a0a0a]">
      <div className="relative">
        <m.span
          aria-hidden
          initial={{ opacity: 0 }}
          animate={ringControls}
          className="pointer-events-none absolute inset-0 z-10 rounded-xl ring-2 ring-indigo-400/70"
        />
        <InstallCommand
          command={installCmd}
          mobileCopyPrompt={mobilePrompt}
          meta={
            <m.span
              animate={countControls}
              className="inline-flex origin-center items-center rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-medium tabular-nums text-indigo-300 ring-1 ring-inset ring-indigo-500/25"
            >
              {selectedCount} / {allHooks.length} selected
            </m.span>
          }
        />
      </div>
      <p className="mt-2 px-1 text-[11px] text-zinc-400">{T.installCaption}</p>
    </div>
  )
}
