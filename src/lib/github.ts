const REGISTRY_REPO = process.env.NEXT_PUBLIC_REGISTRY_REPO as string | undefined

export interface SubmissionResult {
  mode: 'prefilled-url'
  issueUrl: string
}

export function buildSubmissionIssueUrl(repoUrl: string): SubmissionResult {
  const repo = REGISTRY_REPO ?? 'your-org/hookit-registry'
  const title = encodeURIComponent(`repo-submission: ${repoUrl}`)
  const body = encodeURIComponent(
    [
      '## Soumission de dépôt pour analyse',
      '',
      `Dépôt à analyser : ${repoUrl}`,
      '',
      "L'agent d'analyse va parcourir ce dépôt pour détecter les hooks",
      'agentiques (Claude Code / Copilot) non encore présents dans le registre.',
    ].join('\n')
  )
  const issueUrl = `https://github.com/${repo}/issues/new?labels=repo-submission&title=${title}&body=${body}`
  return { mode: 'prefilled-url', issueUrl }
}

export function isValidGitHubRepoUrl(value: string): boolean {
  return /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(value.trim())
}
