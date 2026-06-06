import { describe, it, expect } from 'vitest';
import { run } from '../../.claude/hooks/ecosystem-guard.mjs';

const PROJECT = '/proj';
const call = (filePath) => run({ tool_input: { file_path: filePath } }, { projectDir: PROJECT });

describe('ecosystem-guard', () => {
  it('returns null pour un fichier non stratégique', () => {
    expect(call(`${PROJECT}/src/components/Button.tsx`)).toBeNull();
  });

  it('returns null si pas de file_path', () => {
    expect(run({ tool_input: {} }, { projectDir: PROJECT })).toBeNull();
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
    expect(result.hookSpecificOutput.additionalContext).toContain('i18n.ts');
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

  it('inclut le label et le conseil dans le message', () => {
    const result = call(`${PROJECT}/src/lib/i18n.ts`);
    expect(result.hookSpecificOutput.additionalContext).toContain('UI copy / taglines du site');
    expect(result.hookSpecificOutput.additionalContext).toContain('ECOSYSTEM GUARD');
  });
});
