import { describe, it, expect } from 'vitest';
import { run } from '../../.claude/hooks/ecosystem-guard.mjs';

const PROJECT = '/proj';

const MAP = [
  {
    matches: ['src/lib/i18n.ts'],
    label: 'UI copy / taglines du site',
    check: ['README.md', 'packages/cli/README.md'],
    tip: 'Propager vers README et CLI README',
  },
  {
    matches: ['README.md'],
    label: 'README projet (GitHub)',
    check: ['packages/cli/README.md', 'src/lib/i18n.ts'],
    tip: 'Vérifier cohérence avec CLI README et i18n.ts',
  },
  {
    matches: ['packages/cli/README.md'],
    label: 'CLI README (npm)',
    check: ['README.md', 'src/lib/i18n.ts'],
    tip: 'Vérifier cohérence avec README et i18n.ts',
  },
  {
    matches: ['doc/hookstack/'],
    label: 'vision / stratégie produit',
    check: ['src/lib/i18n.ts', 'README.md', 'packages/cli/README.md'],
    tip: 'Propager vers toutes les surfaces',
  },
  {
    matches: ['DESIGN.md'],
    label: 'système de design',
    check: ['doc/hookstack/05-ux.md'],
    tip: 'Mettre à jour la doc UX',
  },
];

const mapContent = JSON.stringify(MAP);
const deps = {
  projectDir: PROJECT,
  exists: (p) => p.endsWith('ecosystem-map.json'),
  readFile: () => mapContent,
};

const call = (filePath) => run({ tool_input: { file_path: filePath } }, deps);

describe('ecosystem-guard', () => {
  it('returns null si pas de file_path', () => {
    expect(run({ tool_input: {} }, deps)).toBeNull();
  });

  it('returns null si la map est absente', () => {
    const noDeps = { projectDir: PROJECT, exists: () => false, readFile: () => '' };
    expect(run({ tool_input: { file_path: `${PROJECT}/README.md` } }, noDeps)).toBeNull();
  });

  it('returns null pour un fichier non stratégique', () => {
    expect(call(`${PROJECT}/src/components/Button.tsx`)).toBeNull();
  });

  it('se déclenche sur src/lib/i18n.ts', () => {
    const result = call(`${PROJECT}/src/lib/i18n.ts`);
    expect(result).not.toBeNull();
    expect(result.hookSpecificOutput.additionalContext).toContain('README.md');
    expect(result.hookSpecificOutput.additionalContext).toContain('packages/cli/README.md');
  });

  it('se déclenche sur README.md et signale le CLI README', () => {
    const result = call(`${PROJECT}/README.md`);
    expect(result).not.toBeNull();
    expect(result.hookSpecificOutput.additionalContext).toContain('packages/cli/README.md');
    expect(result.hookSpecificOutput.additionalContext).toContain('i18n.ts');
  });

  it('se déclenche sur packages/cli/README.md', () => {
    const result = call(`${PROJECT}/packages/cli/README.md`);
    expect(result).not.toBeNull();
    expect(result.hookSpecificOutput.additionalContext).toContain('README.md');
  });

  it('se déclenche sur doc/hookstack/ (sous-fichier quelconque)', () => {
    const result = call(`${PROJECT}/doc/hookstack/07-strategie-marketing.md`);
    expect(result).not.toBeNull();
    expect(result.hookSpecificOutput.additionalContext).toContain('i18n.ts');
    expect(result.hookSpecificOutput.additionalContext).toContain('README.md');
  });

  it('se déclenche sur DESIGN.md et signale la doc UX', () => {
    const result = call(`${PROJECT}/DESIGN.md`);
    expect(result).not.toBeNull();
    expect(result.hookSpecificOutput.additionalContext).toContain('05-ux.md');
  });

  it('inclut le label et ECOSYSTEM GUARD dans le message', () => {
    const result = call(`${PROJECT}/src/lib/i18n.ts`);
    expect(result.hookSpecificOutput.additionalContext).toContain('UI copy / taglines du site');
    expect(result.hookSpecificOutput.additionalContext).toContain('ECOSYSTEM GUARD');
  });
});
