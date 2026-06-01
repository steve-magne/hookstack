'use client'

import { useEffect, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { splitFlap } from '@/lib/motion'

/**
 * SplitFlap — révélation « tableau d'affichage » (Solari) d'une chaîne.
 *
 * Chaque caractère fait défiler des glyphes aléatoires puis se verrouille sur sa
 * valeur finale, en cascade gauche → droite. C'est l'effet ⑨ du DESIGN : le
 * geste d'entrée des listes, joué une seule fois au chargement (`play`).
 *
 * Particularité : c'est une animation de *contenu* (le texte change), pas de
 * transform — Motion ne peut donc pas la neutraliser. L'accessibilité est gérée
 * ici via `useReducedMotion()` (rendu direct du texte) et un doublon `sr-only`
 * pour que les lecteurs d'écran ne lisent jamais les glyphes parasites.
 *
 * Zéro layout shift : une copie invisible du texte final réserve la largeur ;
 * la couche animée est superposée en absolu et clippée à cette boîte.
 */

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/\\-_|<>*'

interface Props {
  text: string
  /** Joue l'effet au montage. À false → rendu direct (re-filtrage, post-intro). */
  play?: boolean
  /** Retard de départ en ms — sert la cascade entre lignes. */
  delay?: number
  /** Texte multi-lignes (paragraphe) : autorise le retour à la ligne au lieu de clipper. */
  block?: boolean
  className?: string
  /** Classes portées par les couches de texte (ex. dégradé `bg-clip-text` du hero). */
  innerClassName?: string
  /** Cadence de rotation des glyphes (ms). Défaut : token `splitFlap`. */
  cell?: number
  /** Décalage de verrouillage entre caractères (ms). Plus grand = vague plus marquée. */
  perChar?: number
  /** Durée de rotation d'un caractère avant verrouillage (ms). Plus court = plus vif. */
  spin?: number
  /**
   * Mode « impatient » : tout le texte tourne dès la 1re frame (le tableau est
   * plein immédiatement, zéro attente), puis se verrouille gauche → droite. Sans
   * lui (défaut), chaque caractère reste vide jusqu'à son tour — l'effet « cascade »
   * de révélation des listes.
   */
  eager?: boolean
}

const randomGlyph = () => GLYPHS[(Math.random() * GLYPHS.length) | 0]

export function SplitFlap({
  text,
  play = true,
  delay = 0,
  block = false,
  className,
  innerClassName,
  cell = splitFlap.cell,
  perChar = splitFlap.perChar,
  spin = splitFlap.spin,
  eager = false,
}: Props) {
  const reduce = useReducedMotion()
  const active = play && !reduce
  const [display, setDisplay] = useState(() => (active ? '' : text))

  useEffect(() => {
    if (!active) {
      setDisplay(text)
      return
    }
    // En eager, on remplit la 1re frame de glyphes : le titre est « présent »
    // instantanément. Sinon, départ vide (la cascade fera apparaître chaque ligne).
    const startAt = performance.now() + (eager ? 0 : delay)
    setDisplay(eager ? text.replace(/[^ ]/g, randomGlyph) : '')
    const id = setInterval(() => {
      const t = performance.now() - startAt
      if (t < 0) return
      let done = true
      let out = ''
      for (let i = 0; i < text.length; i++) {
        const ch = text[i]
        if (ch === ' ') {
          out += ' '
          continue
        }
        // Seuils : en eager tout tourne dès t=0 et `delay` ne décale que le
        // verrouillage (continuité gauche → droite entre segments du titre).
        const spinFrom = eager ? 0 : i * perChar
        const lockAt = eager ? delay + spin + i * perChar : i * perChar + spin
        if (t < spinFrom) {
          done = false
        } else if (t < lockAt) {
          out += randomGlyph()
          done = false
        } else {
          out += ch
        }
      }
      if (done) {
        setDisplay(text)
        clearInterval(id)
      } else {
        setDisplay(out)
      }
    }, cell)
    return () => clearInterval(id)
  }, [text, delay, active, cell, perChar, spin, eager])

  return (
    <span
      className={`relative max-w-full overflow-hidden align-bottom ${
        block ? 'block' : 'inline-block'
      } ${className ?? ''}`}
    >
      {/* Réserve la boîte finale (largeur, et hauteur en mode block) + porte l'ellipsis hérité. */}
      <span className={`invisible ${innerClassName ?? ''}`} aria-hidden>
        {text}
      </span>
      {/* Couche animée — superposée, clippée, jamais lue par les lecteurs d'écran. */}
      <span
        aria-hidden
        className={`absolute inset-0 overflow-hidden ${
          block ? 'whitespace-pre-wrap break-words' : 'whitespace-nowrap'
        } ${innerClassName ?? ''}`}
      >
        {display}
      </span>
      <span className="sr-only">{text}</span>
    </span>
  )
}
