'use client'

import { useState, type ReactNode } from 'react'
import { Button } from './Button'
import { CopySwap } from './CopySwap'
import { useT } from '@/lib/locale-context'
import { track } from '@/lib/analytics'

/** Décompte les hooks d'une commande `install [--hooks=a,b,c]`. */
function parseInstall(command: string) {
  const [, hooksPart = ''] = command.split('--hooks=')
  const count = hooksPart ? hooksPart.split(',').filter(Boolean).length : 0
  return { hook_count: count, is_default: !command.includes('--hooks=') }
}

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
export function InstallCommand({ command, meta, mobileCopyPrompt, source = 'sticky_banner' }: { command: string; meta?: ReactNode; mobileCopyPrompt?: string; source?: string }) {
  const T = useT()
  const [copied, setCopied] = useState(false)
  const [mobileCopied, setMobileCopied] = useState(false)

  const copy = async () => {
    // Conversion : à marquer comme key event dans GA4. Émis sur le clic (intention),
    // avant le presse-papiers — qui peut rejeter (focus, permissions Safari) sans
    // que l'intention de copier change.
    track('copy_install_command', { source, method: 'button', ...parseInstall(command) })
    try { await navigator.clipboard.writeText(command) } catch { /* presse-papiers indisponible */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const copyMobile = async () => {
    track('copy_install_command', { source, method: 'mobile_prompt', ...parseInstall(command) })
    try { await navigator.clipboard.writeText(mobileCopyPrompt ?? command) } catch { /* presse-papiers indisponible */ }
    setMobileCopied(true)
    setTimeout(() => setMobileCopied(false), 1500)
  }

  const hasHooksOption = command.includes('--hooks=')
  const [, hooksPart = ''] = command.split('--hooks=')
  const slugs = hooksPart ? hooksPart.split(',').filter(Boolean) : []

  return (
    <div data-component="InstallCommand" className="overflow-hidden rounded-xl border border-zinc-700/70 bg-[#0c0c12] shadow-lg shadow-black/40">
      {/* InstallCommand-chrome — feux macOS + label + slot meta */}
      <div data-component="InstallCommand-chrome" className="flex items-center gap-2 border-b border-white/5 bg-white/[0.015] px-3.5 py-2">
        <span aria-hidden className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </span>
        <span className="ml-1 font-mono text-[11px] text-zinc-500">{T.installTerminalLabel}</span>
        {meta && <div className="ml-auto">{meta}</div>}
      </div>

      {/* InstallCommand-body — commande + CTA copier */}
      <div data-component="InstallCommand-body" className="flex items-center gap-3 px-4 py-3">
        <code className="min-w-0 flex-1 truncate font-mono text-[13px] sm:text-sm">
          <span className="select-none text-zinc-600">$ </span>
          <span className="text-zinc-300">npx</span>{' '}
          <span className="text-zinc-200">hookstack-cli@latest</span>{' '}
          <span className="text-zinc-200">install</span>{' '}
          {hasHooksOption && (
            <>
              <span className="text-zinc-500">--hooks=</span>
              {slugs.length > 0 ? (
                slugs.map((s, i) => (
                  <span key={s}>
                    <span className="text-zinc-300">{s}</span>
                    {i < slugs.length - 1 && <span className="text-zinc-600">,</span>}
                  </span>
                ))
              ) : (
                <span className="text-zinc-600">{T.installPlaceholder}</span>
              )}
            </>
          )}
        </code>

        {mobileCopyPrompt ? (
          /* Desktop only — masqué sur mobile, le CTA mobile est en dessous */
          <div className="hidden sm:contents">
            <Button size="md" onClick={copy} aria-label={copied ? T.copied : T.copy} className="shrink-0">
              <CopySwap copied={copied} />
              <span>{copied ? T.copied : T.copy}</span>
            </Button>
          </div>
        ) : (
          <Button size="md" onClick={copy} aria-label={copied ? T.copied : T.copy} className="shrink-0">
            <CopySwap copied={copied} />
            <span className="hidden sm:inline">{copied ? T.copied : T.copy}</span>
          </Button>
        )}
      </div>

      {/* Mobile CTA — full-width button below the command, only when mobileCopyPrompt is set */}
      {mobileCopyPrompt && (
        <div className="border-t border-white/5 px-3 pb-3 pt-2 sm:hidden">
          <Button
            onClick={copyMobile}
            aria-label={mobileCopied ? T.copied : T.mobileCopyBtn}
            className="w-full"
          >
            <CopySwap copied={mobileCopied} />
            {mobileCopied ? T.copied : T.mobileCopyBtn}
          </Button>
        </div>
      )}
    </div>
  )
}
