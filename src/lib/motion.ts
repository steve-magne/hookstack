/**
 * motion.ts — Le langage de motion unique de Claude Hooks.
 *
 * Toute la grammaire d'animation du site vit ici. Rien d'animé ailleurs
 * n'invente sa propre physique : on importe ces tokens. C'est ce qui donne
 * la cohérence — la « signature » — perçue par l'œil d'un dev front-end.
 *
 * Principe : transform/opacity uniquement (GPU). L'accessibilité est gérée
 * globalement par <MotionProvider> via MotionConfig reducedMotion="user".
 */

import type { Transition, Variants } from 'motion/react'

/** Easing maison — expo-out. C'est déjà la marque du site (modale CSS d'origine). */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const

/** Springs partagés — une physique, deux personnalités. */
export const spring = {
  /** Micro-gestes directs : checkbox, toggle, tap. Vif, précis, sans rebond mou. */
  snappy: { type: 'spring', stiffness: 500, damping: 32, mass: 1 } satisfies Transition,
  /** Surfaces et reflows : modale, chips, layout (FLIP). Posé, fluide. */
  smooth: { type: 'spring', stiffness: 300, damping: 30 } satisfies Transition,
  /** Suivi doux d'une position continue : carte de prévisualisation. */
  gentle: { type: 'spring', stiffness: 200, damping: 28 } satisfies Transition,
}

/** Durées de référence (en secondes). */
export const duration = {
  micro: 0.15,
  base: 0.3,
  reveal: 0.4,
} as const

/** Révélation de base : monte légèrement en s'éclaircissant. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.reveal, ease: EASE_OUT },
  },
}

/**
 * Conteneur orchestrant une cascade. Le stagger est volontairement court
 * (40 ms) : on suggère le mouvement, on ne le subit pas.
 */
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
}

/**
 * Révélation d'une section : la section s'éclaircit *et* orchestre la cascade
 * de ses lignes (stagger serré). Un seul token pour un comportement composite.
 */
export const sectionReveal: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: duration.reveal,
      ease: EASE_OUT,
      staggerChildren: 0.025,
      delayChildren: 0.04,
    },
  },
}
