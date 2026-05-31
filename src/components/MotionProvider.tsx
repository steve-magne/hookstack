'use client'

import { LazyMotion, domMax, MotionConfig } from 'motion/react'

/**
 * MotionProvider — racine de tout le motion du site.
 *
 * - LazyMotion + domMax : les features (layout, drag, gestures) sont chargées
 *   à la demande. Condition : on utilise `m.*` partout, jamais `motion.*`.
 * - MotionConfig reducedMotion="user" : l'accessibilité devient automatique
 *   sur 100 % des animations. Pour les utilisateurs `prefers-reduced-motion`,
 *   Motion neutralise transform/layout et ne garde que l'opacity. On n'écrit
 *   aucune media query manuelle.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domMax} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  )
}
