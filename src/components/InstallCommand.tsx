'use client'

import { useState, type ReactNode } from 'react'
import { CopySwap } from './CopySwap'
import { useT } from '@/lib/locale-context'

/**
 * InstallCommand — le « terminal » d'installation, pièce maîtresse du site.
 *
 * Rend la commande `npx hookstack-cli@latest install --hooks=…` comme un vrai
 * terminal (chrome macOS, prompt `$`, coloration syntaxique des slugs) avec un
 * bouton « Copier » primaire. Gère son propre état de copie. Partagé par la
 * bannière sticky du catalogue et le configurateur — une seule vérité visuelle.
 *
 * `meta` : slot optionnel à droite du chrome (ex. compteur de sélection pulsé).
 */
export function InstallCommand({ command, meta }: { command: string; meta?: ReactNode }) {
  const T = useT()
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  // Format figé : `npx hookstack-cli@latest install --hooks=<csv>`.
  const [, hooksPart = ''] = command.split('--hooks=')
  const slugs = hooksPart ? hooksPart.split(',').filter(Boolean) : []

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-700/70 bg-[#0c0c12] shadow-lg shadow-black/40">
      {/* Chrome — feux macOS + label + slot meta */}
      <div className="flex items-center gap-2 border-b border-white/5 bg-white/[0.015] px-3.5 py-2">
        <span aria-hidden className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </span>
        <span className="ml-1 font-mono text-[11px] text-zinc-500">{T.installTerminalLabel}</span>
        {meta && <div className="ml-auto">{meta}</div>}
      </div>

      {/* Commande + CTA */}
      <div className="flex items-center gap-3 px-4 py-3">
        <code className="min-w-0 flex-1 truncate font-mono text-[13px] sm:text-sm">
          <span className="select-none text-zinc-600">$ </span>
          <span className="text-violet-300">npx</span>{' '}
          <span className="text-zinc-200">hookstack-cli@latest</span>{' '}
          <span className="text-zinc-200">install</span>{' '}
          <span className="text-zinc-500">--hooks=</span>
          {slugs.length > 0 ? (
            slugs.map((s, i) => (
              <span key={`${s}-${i}`}>
                <span className="text-indigo-300">{s}</span>
                {i < slugs.length - 1 && <span className="text-zinc-600">,</span>}
              </span>
            ))
          ) : (
            <span className="text-zinc-600">{T.installPlaceholder}</span>
          )}
        </code>

        <button
          onClick={copy}
          aria-label={copied ? T.copied : T.copy}
          className="group shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 active:bg-zinc-200"
        >
          <CopySwap copied={copied} />
          <span className="hidden sm:inline">{copied ? T.copied : T.copy}</span>
        </button>
      </div>
    </div>
  )
}
