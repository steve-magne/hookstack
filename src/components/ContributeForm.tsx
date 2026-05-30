'use client'

import { useState } from 'react'
import { ExternalLink, GitPullRequest } from 'lucide-react'
import { buildSubmissionIssueUrl, isValidGitHubRepoUrl } from '@/lib/github'
import { useT } from '@/lib/locale-context'

export function ContributeForm() {
  const T = useT()
  const [repoUrl, setRepoUrl] = useState('')
  const [issueUrl, setIssueUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!isValidGitHubRepoUrl(repoUrl)) {
      setError(T.contributeError)
      return
    }
    const { issueUrl } = buildSubmissionIssueUrl(repoUrl)
    setIssueUrl(issueUrl)
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-300">
            {T.contributeFormLabel}
          </label>
          <input
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/org/repo"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-zinc-100 placeholder:text-[var(--color-text-muted)] focus:border-white/40 focus:ring-1 focus:ring-white/10 focus:outline-none transition-colors"
          />
          {error && <p className="mt-1.5 text-sm text-zinc-400">{error}</p>}
        </div>

        <button
          type="submit"
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100 transition-colors"
        >
          <GitPullRequest className="size-4" />
          {T.contributeSubmitBtn}
        </button>
      </form>

      {issueUrl && (
        <div className="mt-5 rounded-lg border border-white/15 bg-white/6 p-4">
          <p className="mb-2 text-sm text-zinc-200">{T.contributeSuccessText}</p>
          <a
            href={issueUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-white underline underline-offset-2"
          >
            <ExternalLink className="size-4" /> {T.contributeIssueLink}
          </a>
          <p className="mt-3 text-xs text-zinc-500">
            {T.contributeNote.split('repo-submission').map((part, i, arr) =>
              i < arr.length - 1 ? (
                <span key={i}>
                  {part}
                  <code>repo-submission</code>
                </span>
              ) : (
                <span key={i}>{part}</span>
              )
            )}
          </p>
        </div>
      )}
    </div>
  )
}
