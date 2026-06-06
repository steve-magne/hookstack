// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/setup-worktree-env.mjs';

const MAIN = '/repos/hookstack';
const WORKTREE = '/repos/hookstack-wt';

function makeExec(main = MAIN, wt = WORKTREE) {
  return (cmd) => {
    if (cmd === 'git worktree list') return `${main}  abc1234 [main]\n${wt}  def5678 [feature]`;
    if (cmd === 'git rev-parse --show-toplevel') return wt;
    return '';
  };
}

const noScan = () => [];

// ─── Gardes d'entrée ─────────────────────────────────────────────────────────

describe('gardes d entrée', () => {
  it('ne fait rien si git worktree list est vide', () => {
    const copy = vi.fn();
    run({ exec: () => '', exists: () => false, copy, mkdir: vi.fn(), scanEnvFiles: noScan });
    expect(copy).not.toHaveBeenCalled();
  });

  it('ne fait rien si mainDir === worktreeDir (branche principale)', () => {
    const copy = vi.fn();
    run({ exec: makeExec(MAIN, MAIN), exists: () => false, copy, mkdir: vi.fn(), scanEnvFiles: noScan });
    expect(copy).not.toHaveBeenCalled();
  });
});

// ─── Liste statique racine ────────────────────────────────────────────────────

describe('liste statique racine', () => {
  it('copie .env présent dans main et absent du worktree', () => {
    const copy = vi.fn();
    const exists = (p) => p === `${MAIN}/.env`;
    run({ exec: makeExec(), exists, copy, mkdir: vi.fn(), scanEnvFiles: noScan });
    expect(copy).toHaveBeenCalledWith(`${MAIN}/.env`, `${WORKTREE}/.env`);
    expect(copy).toHaveBeenCalledTimes(1);
  });

  it('copie .env.local et .env.development.local si présents', () => {
    const copy = vi.fn();
    const existing = new Set(['.env.local', '.env.development.local'].map(f => `${MAIN}/${f}`));
    const exists = (p) => existing.has(p);
    run({ exec: makeExec(), exists, copy, mkdir: vi.fn(), scanEnvFiles: noScan });
    const copied = copy.mock.calls.map(([src]) => src.replace(MAIN + '/', ''));
    expect(copied).toContain('.env.local');
    expect(copied).toContain('.env.development.local');
    expect(copy).toHaveBeenCalledTimes(2);
  });

  it('copie .envrc (direnv)', () => {
    const copy = vi.fn();
    const exists = (p) => p === `${MAIN}/.envrc`;
    run({ exec: makeExec(), exists, copy, mkdir: vi.fn(), scanEnvFiles: noScan });
    expect(copy).toHaveBeenCalledWith(`${MAIN}/.envrc`, `${WORKTREE}/.envrc`);
  });

  it('copie config/master.key (Rails) et crée le dossier intermédiaire manquant', () => {
    const copy = vi.fn();
    const mkdir = vi.fn();
    const exists = (p) => p === `${MAIN}/config/master.key`;
    run({ exec: makeExec(), exists, copy, mkdir, scanEnvFiles: noScan });
    expect(mkdir).toHaveBeenCalledWith(`${WORKTREE}/config`, { recursive: true });
    expect(copy).toHaveBeenCalledWith(`${MAIN}/config/master.key`, `${WORKTREE}/config/master.key`);
  });

  it('ne copie pas si le fichier existe déjà dans le worktree', () => {
    const copy = vi.fn();
    run({ exec: makeExec(), exists: () => true, copy, mkdir: vi.fn(), scanEnvFiles: noScan });
    expect(copy).not.toHaveBeenCalled();
  });

  it('ne copie pas si le fichier source est absent dans main', () => {
    const copy = vi.fn();
    run({ exec: makeExec(), exists: () => false, copy, mkdir: vi.fn(), scanEnvFiles: noScan });
    expect(copy).not.toHaveBeenCalled();
  });

  it('couvre les variantes staging et production', () => {
    const copy = vi.fn();
    const files = ['.env.staging', '.env.staging.local', '.env.production', '.env.production.local'];
    const existing = new Set(files.map(f => `${MAIN}/${f}`));
    const exists = (p) => existing.has(p);
    run({ exec: makeExec(), exists, copy, mkdir: vi.fn(), scanEnvFiles: noScan });
    const copied = copy.mock.calls.map(([src]) => src.replace(MAIN + '/', ''));
    for (const f of files) expect(copied).toContain(f);
  });
});

// ─── Scan monorepo ────────────────────────────────────────────────────────────

describe('scan monorepo (scanEnvFiles)', () => {
  it('copie les fichiers env trouvés dans les sous-répertoires', () => {
    const copy = vi.fn();
    const subFiles = ['apps/web/.env', 'apps/api/.env.local', 'packages/utils/.env'];
    const scanEnvFiles = () => subFiles;
    const exists = (p) => p.startsWith(MAIN + '/');
    run({ exec: makeExec(), exists, copy, mkdir: vi.fn(), scanEnvFiles });
    const copied = copy.mock.calls.map(([src]) => src.replace(MAIN + '/', ''));
    expect(copied).toContain('apps/web/.env');
    expect(copied).toContain('apps/api/.env.local');
    expect(copied).toContain('packages/utils/.env');
  });

  it('ne copie pas un fichier monorepo déjà présent dans le worktree', () => {
    const copy = vi.fn();
    const scanEnvFiles = () => ['frontend/.env'];
    run({ exec: makeExec(), exists: () => true, copy, mkdir: vi.fn(), scanEnvFiles });
    expect(copy).not.toHaveBeenCalled();
  });

  it('déduplique si le scan retourne un fichier déjà dans ROOT_FILES', () => {
    const copy = vi.fn();
    const scanEnvFiles = () => ['.env', 'frontend/.env'];
    const exists = (p) => p.startsWith(MAIN + '/');
    run({ exec: makeExec(), exists, copy, mkdir: vi.fn(), scanEnvFiles });
    const copied = copy.mock.calls.map(([src]) => src.replace(MAIN + '/', ''));
    expect(copied.filter(f => f === '.env')).toHaveLength(1);
    expect(copied).toContain('frontend/.env');
  });

  it('crée les répertoires intermédiaires manquants pour les fichiers monorepo', () => {
    const copy = vi.fn();
    const mkdir = vi.fn();
    const scanEnvFiles = () => ['apps/web/.env'];
    const exists = (p) => p.startsWith(MAIN + '/') && !p.startsWith(WORKTREE + '/');
    run({ exec: makeExec(), exists, copy, mkdir, scanEnvFiles });
    expect(mkdir).toHaveBeenCalledWith(`${WORKTREE}/apps/web`, { recursive: true });
    expect(copy).toHaveBeenCalledWith(`${MAIN}/apps/web/.env`, `${WORKTREE}/apps/web/.env`);
  });

  it('continue normalement si scanEnvFiles retourne un tableau vide', () => {
    const copy = vi.fn();
    const exists = (p) => p === `${MAIN}/.env`;
    run({ exec: makeExec(), exists, copy, mkdir: vi.fn(), scanEnvFiles: () => [] });
    expect(copy).toHaveBeenCalledWith(`${MAIN}/.env`, `${WORKTREE}/.env`);
    expect(copy).toHaveBeenCalledTimes(1);
  });
});
