'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { SplitFlap } from '@/components/SplitFlap'
import { T } from '@/lib/i18n'
import { splitFlapHero } from '@/lib/motion'

/**
 * HeroRotatingTitle — le titre héros en deux temps.
 *
 * Ligne A « Ship fast. » est l'ancre, figée après l'intro. Ligne B (le dégradé)
 * parcourt `T.heroRotating` toutes les ~30 s. Hover sur le titre avance au slogan
 * suivant instantanément et repart de 30 s.
 *
 * A11y : `prefers-reduced-motion` coupe la rotation (un seul slogan, stable) ;
 * le SplitFlap gère déjà le rendu direct + doublon `sr-only`.
 */

const ROTATE_MS = 30_000

export function HeroRotatingTitle() {
  const reduce = useReducedMotion()
  const [index, setIndex] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (reduce) return
    timerRef.current = setInterval(
      () => setIndex((i) => (i + 1) % T.heroRotating.length),
      ROTATE_MS,
    )
  }, [reduce])

  useEffect(() => {
    resetTimer()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [resetTimer])

  const handleHover = useCallback(() => {
    if (reduce) return
    setIndex((i) => (i + 1) % T.heroRotating.length)
    resetTimer()
  }, [reduce, resetTimer])

  return (
    <h1
      className="mx-auto max-w-4xl text-balance text-5xl font-bold leading-[1.04] tracking-tight text-white sm:text-6xl"
      onMouseEnter={handleHover}
    >
      <SplitFlap text={T.heroTitleA} eager {...splitFlapHero} />{' '}
      <SplitFlap
        text={T.heroRotating[index]}
        delay={(T.heroTitleA.length + 1) * splitFlapHero.perChar}
        eager
        {...splitFlapHero}
      />
      {/* SEO line — keeps the target query "Claude Code hooks" inside the <h1>.
          Smaller + muted so the slogan stays the visual anchor. */}
      <span className="mt-4 block text-balance text-lg font-medium tracking-normal text-zinc-400 sm:text-xl">
        {T.heroTitleSeoLine}
      </span>
    </h1>
  )
}
