// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/stop-dead-link-checker.mjs';

const noMdChanges = () => 'src/lib/utils.ts\nsrc/components/Button.tsx\n';
const withMdChanges = () => 'README.md\ndocs/guide.mdx\nsrc/lib/utils.ts\n';
const mlcClean = () => '';
const mlcBroken = () => {
  const e = new Error('exit 1');
  e.stdout = 'FILE: README.md\n  [✖] https://dead-link.example.com → Status: 404\n';
  throw e;
};
const gitFail = () => { throw new Error('not a git repo'); };

function deps(execMap) {
  return {
    exec: (cmd) => {
      if (cmd.includes('merge-base')) return execMap.mergeBase?.() ?? 'HEAD';
      if (cmd.includes('git diff --name-only')) return execMap.diff?.() ?? '';
      if (cmd.includes('markdown-link-check')) return execMap.mlc?.() ?? '';
      throw new Error(`unmatched cmd: ${cmd}`);
    },
  };
}

describe('stop-dead-link-checker', () => {
  it('retourne null si aucun fichier Markdown modifié', () => {
    expect(run({}, deps({ mergeBase: () => 'abc123', diff: noMdChanges }))).toBeNull();
  });

  it('retourne null si markdown-link-check passe (exit 0)', () => {
    const r = run({}, deps({ mergeBase: () => 'abc123', diff: withMdChanges, mlc: mlcClean }));
    expect(r).toBeNull();
  });

  it('retourne un message si des liens morts sont trouvés', () => {
    const r = run({}, deps({ mergeBase: () => 'abc123', diff: withMdChanges, mlc: mlcBroken }));
    expect(r?.message).toContain('[dead-link-checker]');
    expect(r?.message).toContain('README.md');
  });

  it('retourne null si git échoue complètement', () => {
    const r = run({}, { exec: gitFail });
    expect(r).toBeNull();
  });

  it('filtre uniquement les fichiers .md et .mdx', () => {
    const execSpy = vi.fn((cmd) => {
      if (cmd.includes('merge-base')) return 'HEAD';
      if (cmd.includes('git diff')) return 'README.md\npage.mdx\nindex.ts\nstyle.css\n';
      return '';
    });
    run({}, { exec: execSpy });
    const mlcCalls = execSpy.mock.calls.filter(([c]) => c.includes('markdown-link-check'));
    expect(mlcCalls).toHaveLength(2);
    expect(mlcCalls[0][0]).toContain('README.md');
    expect(mlcCalls[1][0]).toContain('page.mdx');
  });
});
