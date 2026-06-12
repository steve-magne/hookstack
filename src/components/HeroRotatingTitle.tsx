'use client'

import { useEffect, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { SplitFlap } from '@/components/SplitFlap'
import { T } from '@/lib/i18n'
import { splitFlapHero } from '@/lib/motion'

/**
 * HeroRotatingTitle — le titre héros en deux temps.
 *
 * Ligne A « Ship fast. » est l'ancre, figée après l'intro. Ligne B (le dégradé)
 * parcourt `T.heroRotating` toutes les ~30 s : chaque slogan est une valeur
 * concrète apportée par la stack (sécurité, tests, contexte…). Comme `SplitFlap`
 * rejoue son animation dès que sa prop `text` change, faire avancer l'index
 * suffit à redéclencher le « tableau Solari » à chaque rotation — aucun état
 * d'animation à piloter ici.
 *
 * A11y : `prefers-reduced-motion` coupe la rotation (un seul slogan, stable) ;
 * le SplitFlap gère déjà le rendu direct + doublon `sr-only`.
 */

const ROTATE_MS = 30_000

export function HeroRotatingTitle() {
  const reduce = useReducedMotion()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (reduce) return
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % T.heroRotating.length)
    }, ROTATE_MS)
    return () => clearInterval(id)
  }, [reduce])

  return (
    <h1 className="mx-auto max-w-3xl text-balance text-5xl font-bold leading-[1.04] tracking-tight text-white sm:text-6xl">
      <SplitFlap text={T.heroTitleA} eager {...splitFlapHero} />{' '}
      <br className="hidden sm:block" />
      <SplitFlap
        text={T.heroRotating[index]}
        delay={(T.heroTitleA.length + 1) * splitFlapHero.perChar}
        eager
        {...splitFlapHero}
      />
    </h1>
  )
}
