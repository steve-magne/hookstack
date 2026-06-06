// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/setup-worktree-env.mjs';

const MAIN = '/repos/hookstack';
const WORKTREE = '/repos/hookstack-wt';

const GITIGNORE = `
# Dependencies
node_modules/

# Build output
dist/
*.tsbuildinfo
coverage

# Env
.env
.env.local
.env.*.local

# Wildcards
*.local

# Logs
*.log
npm-debug.log*
`;

function makeExec(main = MAIN, wt = WORKTREE) {
  return (cmd) => {
    if (cmd === 'git worktree list') return `${main}  abc1234 [main]\n${wt}  def5678 [feature]`;
    if (cmd === 'git rev-parse --show-toplevel') return wt;
    return '';
  };
}

// Fichiers présents à la racine du dépôt principal (simule ls sur mainDir)
const readdir = () => ['.env', '.env.local', '.env.development.local', 'something.local', 'dist', 'README.md'];
const readFile = () => GITIGNORE;
// Tous les fichiers existent dans main, aucun dans worktree
const existsMainOnly = (p) => p.startsWith(MAIN + '/');

// ─── Gardes d'entrée ─────────────────────────────────────────────────────────

describe('gardes d entrée', () => {
  it('ne fait rien si mainDir est vide (git worktree list vide)', () => {
    const copy = vi.fn();
    run({ exec: () => '', exists: () => false, copy, readFile, readdir });
    expect(copy).not.toHaveBeenCalled();
  });

  it('ne fait rien si mainDir === worktreeDir (on est sur la branche principale)', () => {
    const copy = vi.fn();
    run({ exec: makeExec(MAIN, MAIN), exists: () => false, copy, readFile, readdir });
    expect(copy).not.toHaveBeenCalled();
  });

  it('ne fait rien si .gitignore est absent', () => {
    const copy = vi.fn();
    run({ exec: makeExec(), exists: () => true, copy, readFile: () => { throw new Error('ENOENT'); }, readdir });
    expect(copy).not.toHaveBeenCalled();
  });

  it('ne fait rien si .gitignore est vide', () => {
    const copy = vi.fn();
    run({ exec: makeExec(), exists: existsMainOnly, copy, readFile: () => '', readdir });
    expect(copy).not.toHaveBeenCalled();
  });
});

// ─── Copie nominale ───────────────────────────────────────────────────────────

describe('copie nominale', () => {
  it('copie un fichier exact (.env) présent dans main et absent du worktree', () => {
    const copy = vi.fn();
    const exists = (p) => p === `${MAIN}/.env`;
    run({ exec: makeExec(), exists, copy, readFile, readdir });
    expect(copy).toHaveBeenCalledWith(`${MAIN}/.env`, `${WORKTREE}/.env`);
    expect(copy).toHaveBeenCalledTimes(1);
  });

  it('copie tous les fichiers de config locale trouvés dans le .gitignore', () => {
    const copy = vi.fn();
    run({ exec: makeExec(), exists: existsMainOnly, copy, readFile, readdir });
    const copied = copy.mock.calls.map(([src]) => src.replace(MAIN + '/', ''));
    expect(copied).toContain('.env');
    expect(copied).toContain('.env.local');
    expect(copied).toContain('.env.development.local');
    expect(copied).toContain('something.local');
  });

  it('ne copie pas si le fichier existe déjà dans le worktree', () => {
    const copy = vi.fn();
    run({ exec: makeExec(), exists: () => true, copy, readFile, readdir });
    expect(copy).not.toHaveBeenCalled();
  });

  it('ne copie pas si le fichier source est absent dans main', () => {
    const copy = vi.fn();
    run({ exec: makeExec(), exists: () => false, copy, readFile, readdir });
    expect(copy).not.toHaveBeenCalled();
  });
});

// ─── Déduplication ────────────────────────────────────────────────────────────

describe('déduplication (plusieurs patterns matchent le même fichier)', () => {
  it('ne copie .env.local qu une seule fois meme si .env.local et *.local le couvrent tous deux', () => {
    // .env.local est résolu par le pattern exact ET par le glob *.local
    // Sans Set(), copy serait appelé 2 fois pour .env.local
    const copy = vi.fn();
    const gitignore = `.env.local\n*.local\n`;
    const readdirLocal = () => ['.env.local', 'other.local'];
    const exists = (p) => p.startsWith(MAIN + '/');
    run({ exec: makeExec(), exists, copy, readFile: () => gitignore, readdir: readdirLocal });
    const copyCountFor = (name) =>
      copy.mock.calls.filter(([src]) => src.endsWith(`/${name}`)).length;
    expect(copyCountFor('.env.local')).toBe(1);
    expect(copyCountFor('other.local')).toBe(1);
    expect(copy).toHaveBeenCalledTimes(2);
  });

  it('ne copie .env.development.local qu une seule fois meme si .env.*.local et *.local le couvrent tous deux', () => {
    const copy = vi.fn();
    const gitignore = `.env.*.local\n*.local\n`;
    const readdirDev = () => ['.env.development.local'];
    const exists = (p) => p.startsWith(MAIN + '/');
    run({ exec: makeExec(), exists, copy, readFile: () => gitignore, readdir: readdirDev });
    expect(copy).toHaveBeenCalledTimes(1);
    expect(copy).toHaveBeenCalledWith(`${MAIN}/.env.development.local`, `${WORKTREE}/.env.development.local`);
  });
});

// ─── Filtrage des artefacts ───────────────────────────────────────────────────

describe('filtrage des artefacts generés', () => {
  it('ignore dist/, node_modules/, .next/, build/', () => {
    const copy = vi.fn();
    const gitignore = `node_modules/\ndist/\n.next/\nbuild/\n.env\n`;
    run({ exec: makeExec(), exists: existsMainOnly, copy, readFile: () => gitignore, readdir: () => ['.env'] });
    const copied = copy.mock.calls.map(([src]) => src.replace(MAIN + '/', ''));
    expect(copied).toEqual(['.env']);
  });

  it('ignore coverage sans trailing slash (keyword dans ARTIFACT_DENY)', () => {
    const copy = vi.fn();
    const gitignore = `coverage\n.env\n`;
    run({ exec: makeExec(), exists: existsMainOnly, copy, readFile: () => gitignore, readdir: () => ['coverage', '.env'] });
    const copied = copy.mock.calls.map(([src]) => src.replace(MAIN + '/', ''));
    expect(copied).toEqual(['.env']);
    expect(copied).not.toContain('coverage');
  });

  it('ignore les extensions artefacts (*.log, *.tsbuildinfo, *.map, *.pyc)', () => {
    const copy = vi.fn();
    const gitignore = `*.log\n*.tsbuildinfo\n*.map\n*.pyc\n.env\n`;
    const files = ['app.log', 'tsconfig.tsbuildinfo', 'bundle.map', 'module.pyc', '.env'];
    run({ exec: makeExec(), exists: existsMainOnly, copy, readFile: () => gitignore, readdir: () => files });
    const copied = copy.mock.calls.map(([src]) => src.replace(MAIN + '/', ''));
    expect(copied).toEqual(['.env']);
  });

  it('ignore les patterns debug/error log (npm-debug.log*, yarn-error.log*)', () => {
    const copy = vi.fn();
    const gitignore = `npm-debug.log*\nyarn-error.log*\n.env\n`;
    run({ exec: makeExec(), exists: existsMainOnly, copy, readFile: () => gitignore, readdir: () => ['.env'] });
    const copied = copy.mock.calls.map(([src]) => src.replace(MAIN + '/', ''));
    expect(copied).toEqual(['.env']);
  });

  it('ignore les patterns avec sous-chemin (.vscode/*, .claude/data/)', () => {
    const copy = vi.fn();
    const gitignore = `.env\n.vscode/*\n.claude/data/\n`;
    run({ exec: makeExec(), exists: existsMainOnly, copy, readFile: () => gitignore, readdir: () => ['.env'] });
    const copied = copy.mock.calls.map(([src]) => src.replace(MAIN + '/', ''));
    expect(copied).toEqual(['.env']);
  });

  it('ignore .vercel (config deploy, pas un secret local)', () => {
    const copy = vi.fn();
    const gitignore = `.vercel\n.env\n`;
    run({ exec: makeExec(), exists: existsMainOnly, copy, readFile: () => gitignore, readdir: () => ['.vercel', '.env'] });
    const copied = copy.mock.calls.map(([src]) => src.replace(MAIN + '/', ''));
    expect(copied).toEqual(['.env']);
  });

  it('ignore les patterns de negation gitignore (!.vscode/extensions.json)', () => {
    const copy = vi.fn();
    const gitignore = `.env\n!.vscode/extensions.json\n`;
    run({ exec: makeExec(), exists: existsMainOnly, copy, readFile: () => gitignore, readdir: () => ['.env'] });
    const copied = copy.mock.calls.map(([src]) => src.replace(MAIN + '/', ''));
    expect(copied).toEqual(['.env']);
  });
});

// ─── Robustesse / erreurs ─────────────────────────────────────────────────────

describe('robustesse', () => {
  it('continue si readdir echoue pour un pattern glob (permissions, chemin absent)', () => {
    const copy = vi.fn();
    const gitignore = `.env\n*.local\n`;
    const readdirThrows = () => { throw new Error('EACCES'); };
    // .env est exact (pas de readdir), *.local fait un readdir qui lance
    const exists = (p) => p === `${MAIN}/.env`;
    run({ exec: makeExec(), exists, copy, readFile: () => gitignore, readdir: readdirThrows });
    // .env doit quand meme etre copie, le glob echoue silencieusement
    expect(copy).toHaveBeenCalledWith(`${MAIN}/.env`, `${WORKTREE}/.env`);
    expect(copy).toHaveBeenCalledTimes(1);
  });

  it('ignore les lignes vides et les commentaires dans .gitignore', () => {
    const copy = vi.fn();
    const gitignore = `\n  \n# commentaire\n   # autre\n.env\n`;
    run({ exec: makeExec(), exists: existsMainOnly, copy, readFile: () => gitignore, readdir: () => ['.env'] });
    expect(copy).toHaveBeenCalledTimes(1);
    expect(copy).toHaveBeenCalledWith(`${MAIN}/.env`, `${WORKTREE}/.env`);
  });
});
