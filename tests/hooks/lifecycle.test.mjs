// @vitest-environment node
// Tests groupés des hooks de cycle de vie de session, setup et tâches.
import { describe, it, expect, vi } from 'vitest';
import { run as reloadEnv } from '../../.claude/hooks/file-changed-reload-env.mjs';
import { run as reloadDirenv } from '../../.claude/hooks/reload-direnv.mjs';
import { run as postCompactSave } from '../../.claude/hooks/post-compact-save-summary.mjs';
import { run as preCompactBackup } from '../../.claude/hooks/pre-compact-backup.mjs';
import { run as sessionChangelog } from '../../.claude/hooks/session-changelog.mjs';
import { run as sessionDedup } from '../../.claude/hooks/session-dedup-autodisable.mjs';
import { run as sessionEndCleanup } from '../../.claude/hooks/session-end-cleanup.mjs';
import { run as pullIfMain } from '../../.claude/hooks/session-start-pull-if-main.mjs';
import { run as stashWarning } from '../../.claude/hooks/session-start-stash-warning.mjs';
import { run as worktreeIfMain } from '../../.claude/hooks/session-start-worktree-if-main.mjs';
import { run as checkDeps } from '../../.claude/hooks/setup-check-deps.mjs';
import { run as installDeps } from '../../.claude/hooks/setup-install-deps.mjs';
import { run as testGate } from '../../.claude/hooks/task-completed-test-gate.mjs';
import { run as namingConvention } from '../../.claude/hooks/task-created-naming-convention.mjs';

describe('file-changed-reload-env', () => {
  it('recharge les variables valides', () => {
    const append = vi.fn();
    const r = reloadEnv(
      { file_path: '.env', event: 'change' },
      { readFile: () => 'FOO=1\n# comment\nBAR=2', append, envFile: '/tmp/env' },
    );
    expect(r.count).toBe(2);
    expect(append).toHaveBeenCalledWith('/tmp/env', 'export FOO=1\n');
  });
  it('ignore unlink', () => {
    expect(reloadEnv({ event: 'unlink' }, { envFile: '/tmp/env' })).toBeNull();
  });
  it('ignore sans CLAUDE_ENV_FILE', () => {
    expect(reloadEnv({ file_path: '.env' }, { envFile: undefined })).toBeNull();
  });
});

describe('reload-direnv', () => {
  it('recharge si .envrc présent', () => {
    const exec = vi.fn();
    const r = reloadDirenv({ cwd: '/p' }, { exec, exists: () => true });
    expect(exec).toHaveBeenCalledWith('direnv allow .', '/p');
    expect(r.message).toContain('rechargé');
  });
  it('ignore si pas de .envrc', () => {
    expect(reloadDirenv({ cwd: '/p' }, { exec: vi.fn(), exists: () => false })).toBeNull();
  });
});

describe('post-compact-save-summary', () => {
  it('journalise un résumé', () => {
    const append = vi.fn();
    const e = postCompactSave({ compact_summary: 'résumé', trigger: 'manual' }, { append, mkdir: vi.fn(), projectDir: '/p', now: () => 'T' });
    expect(e).toContain('résumé');
    expect(append).toHaveBeenCalled();
  });
  it('ignore un résumé vide', () => {
    expect(postCompactSave({ compact_summary: '  ' }, { append: vi.fn(), mkdir: vi.fn() })).toBeNull();
  });
});

describe('pre-compact-backup', () => {
  it('sauvegarde le résumé', () => {
    const writeFile = vi.fn();
    const r = preCompactBackup({ summary: 's', session_id: 's1' }, { writeFile, mkdir: vi.fn(), backupDir: '/bk', now: () => 'T' });
    expect(r.file).toBe('/bk/s1.json');
    expect(writeFile).toHaveBeenCalled();
  });
  it('ignore sans résumé', () => {
    expect(preCompactBackup({}, { writeFile: vi.fn(), mkdir: vi.fn() })).toBeNull();
  });
});

describe('session-changelog', () => {
  const exec = (cmd) => {
    if (cmd.includes('branch')) return 'main';
    if (cmd.includes('diff')) return ' file | 2 +-';
    if (cmd.includes('log')) return '- fix (abc)';
    return '';
  };
  it('ajoute une entrée si CHANGELOG existe', () => {
    const append = vi.fn();
    const r = sessionChangelog({ exec, append, exists: () => true, projectDir: '/p', now: () => '2026-06-02T00:00:00Z' });
    expect(r.written).toBe(true);
    expect(append).toHaveBeenCalled();
  });
  it('ignore si CHANGELOG absent', () => {
    const r = sessionChangelog({ exec, append: vi.fn(), exists: () => false, projectDir: '/p', now: () => '2026-06-02T00:00:00Z' });
    expect(r.written).toBe(false);
  });
  it('retourne null sans diff ni commits', () => {
    expect(sessionChangelog({ exec: () => '', exists: () => true, projectDir: '/p' })).toBeNull();
  });
});

describe('session-dedup-autodisable', () => {
  it('signale les hooks à désactiver', () => {
    const deps = { exists: () => true, readdir: () => ['a.counter'], readFile: () => '3', counterDir: '/c' };
    expect(sessionDedup(deps).toDisable).toEqual(['a']);
  });
  it('retourne null sous le seuil', () => {
    const deps = { exists: () => true, readdir: () => ['a.counter'], readFile: () => '1', counterDir: '/c' };
    expect(sessionDedup(deps)).toBeNull();
  });
  it('retourne null si pas de dossier', () => {
    expect(sessionDedup({ exists: () => false, counterDir: '/c' })).toBeNull();
  });
});

describe('session-end-cleanup', () => {
  it('supprime les fichiers claude- périmés', () => {
    const unlink = vi.fn();
    const deps = {
      readdir: () => ['claude-old', 'other'],
      stat: () => ({ mtimeMs: 0 }),
      unlink,
      tmp: '/tmp',
      maxAge: 1000,
      now: () => 10_000_000,
    };
    expect(sessionEndCleanup(deps).cleaned).toBe(1);
    expect(unlink).toHaveBeenCalledWith('/tmp/claude-old');
  });
  it('ne supprime rien si récent', () => {
    const deps = { readdir: () => ['claude-new'], stat: () => ({ mtimeMs: 9_999_999 }), unlink: vi.fn(), now: () => 10_000_000, maxAge: 1000 };
    expect(sessionEndCleanup(deps).cleaned).toBe(0);
  });
});

describe('session-start-pull-if-main', () => {
  it('retourne null hors de main', () => {
    expect(pullIfMain({ exec: () => 'feature' })).toBeNull();
  });
  it('signale une divergence', () => {
    const exec = (cmd) => {
      if (cmd.includes('show-current')) return 'main';
      if (cmd.includes('remote')) return 'origin';
      if (cmd === 'git rev-parse HEAD') return 'aaa';
      if (cmd.includes('@{u}') && cmd.includes('rev-parse')) return 'bbb';
      if (cmd.includes('HEAD..@{u}')) return '2';
      if (cmd.includes('@{u}..HEAD')) return '1';
      return '';
    };
    expect(pullIfMain({ exec, pull: vi.fn() })).toContain('diverge');
  });
  it('pull en avance pure', () => {
    const exec = (cmd) => {
      if (cmd.includes('show-current')) return 'main';
      if (cmd.includes('remote')) return 'origin';
      if (cmd === 'git rev-parse HEAD') return 'aaa';
      if (cmd.includes('@{u}') && cmd.includes('rev-parse')) return 'bbb';
      if (cmd.includes('HEAD..@{u}')) return '3';
      if (cmd.includes('@{u}..HEAD')) return '0';
      return '';
    };
    const pull = vi.fn();
    const out = pullIfMain({ exec, pull });
    expect(pull).toHaveBeenCalled();
    expect(out).toContain('synchronisé');
  });
});

describe('session-start-stash-warning', () => {
  it('avertit pour un stash ancien', () => {
    const old = new Date(Date.now() - 10 * 86400000).toISOString();
    const exec = () => `stash@{0}|${old}|WIP`;
    expect(stashWarning({ exec })).toContain('Stashs Git oubliés');
  });
  it('retourne null sans stash', () => {
    expect(stashWarning({ exec: () => '' })).toBeNull();
  });
  it('retourne null si stash récent', () => {
    const recent = new Date().toISOString();
    expect(stashWarning({ exec: () => `stash@{0}|${recent}|WIP` })).toBeNull();
  });
});

describe('session-start-worktree-if-main', () => {
  const baseExec = (overrides = {}) => (cmd) => {
    if (cmd.includes('show-current')) return overrides.branch ?? 'main';
    if (cmd.includes('show-toplevel')) return '/main';
    if (cmd.includes('worktree list')) return overrides.list ?? '/main abc [main]';
    return '';
  };
  it('retourne null hors de main', () => {
    expect(worktreeIfMain({ exec: baseExec({ branch: 'feat' }) })).toBeNull();
  });
  it('crée un worktree', () => {
    const addWorktree = vi.fn();
    const out = worktreeIfMain({ exec: baseExec(), addWorktree, exists: () => true, now: () => new Date('2026-06-02') });
    expect(addWorktree).toHaveBeenCalled();
    expect(out).toContain('Worktree isolé créé');
  });
  it('réutilise un worktree existant du jour', () => {
    const list = '/main abc [main]\n/main-work-20260602 def [work/session-20260602]';
    const out = worktreeIfMain({ exec: baseExec({ list }), addWorktree: vi.fn(), now: () => new Date('2026-06-02') });
    expect(out).toContain('Worktree session existant');
  });
});

describe('setup-check-deps', () => {
  it('avertit si node_modules absent', () => {
    const exists = (p) => p.endsWith('pnpm-lock.yaml');
    const r = checkDeps({ exists, stat: () => ({ mtimeMs: 0 }), projectDir: '/p' });
    expect(r.warnings.length).toBe(1);
    expect(r.message).toContain('absent');
  });
  it('avertit si lockfile plus récent', () => {
    const exists = (p) => p.endsWith('pnpm-lock.yaml') || p.endsWith('node_modules');
    const stat = (p) => ({ mtimeMs: p.endsWith('pnpm-lock.yaml') ? 100 : 50 });
    expect(checkDeps({ exists, stat, projectDir: '/p' }).warnings.length).toBe(1);
  });
  it('rien si à jour', () => {
    const exists = (p) => p.endsWith('pnpm-lock.yaml') || p.endsWith('node_modules');
    const stat = () => ({ mtimeMs: 100 });
    expect(checkDeps({ exists, stat, projectDir: '/p' }).warnings).toHaveLength(0);
  });
});

describe('setup-install-deps', () => {
  it('installe via pnpm si lockfile présent', () => {
    const exec = vi.fn();
    const exists = (p) => p.endsWith('pnpm-lock.yaml');
    const r = installDeps({ cwd: '/p' }, { exec, exists });
    expect(r.cmd).toBe('pnpm install --frozen-lockfile');
  });
  it('ignore si node_modules présent', () => {
    expect(installDeps({ cwd: '/p' }, { exec: vi.fn(), exists: (p) => p.endsWith('node_modules') })).toBeNull();
  });
  it('retourne null sans manifeste', () => {
    expect(installDeps({ cwd: '/p' }, { exec: vi.fn(), exists: () => false })).toBeNull();
  });
});

describe('task-completed-test-gate', () => {
  it('passe si les tests réussissent', () => {
    expect(testGate({ task_subject: 'x' }, { exec: vi.fn() })).toBeNull();
  });
  it('bloque si les tests échouent', () => {
    const exec = () => { const e = new Error('fail'); e.stdout = Buffer.from('1 failed'); throw e; };
    const r = testGate({ task_subject: 'Ma tâche' }, { exec });
    expect(r.exitCode).toBe(2);
    expect(r.message).toContain('Ma tâche');
  });
});

describe('task-created-naming-convention', () => {
  it('accepte un sujet avec ticket', () => {
    expect(namingConvention({ task_subject: '[PROJ-123] faire X' })).toBeNull();
  });
  it('rejette un sujet sans ticket', () => {
    const r = namingConvention({ task_subject: 'faire X' });
    expect(r.exitCode).toBe(2);
    expect(r.message).toContain('ticket reference');
  });
});
