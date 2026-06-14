// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { run } from '../../.claude/hooks/warn-sudo.mjs';

const bash = (command) => ({ tool_name: 'Bash', tool_input: { command } });

describe('warn-sudo', () => {
  it('avertit sur sudo en début de commande', () => {
    expect(run(bash('sudo apt install jq'))?.message).toContain('sudo');
  });

  it('avertit sur sudo après &&', () => {
    expect(run(bash('cd /opt && sudo make install'))?.message).toContain('sudo');
  });

  it('ne bloque pas (message seulement, pas de decision)', () => {
    const r = run(bash('sudo rm /tmp/x'));
    expect(r?.decision).toBeUndefined();
    expect(r?.message).toBeTruthy();
  });

  it('laisse passer une commande sans sudo', () => {
    expect(run(bash('pnpm install'))).toBeNull();
  });

  it('ignore sudo dans une chaîne entre guillemets', () => {
    expect(run(bash('echo "run sudo manually"'))).toBeNull();
  });

  it('ignore les outils non-Bash', () => {
    expect(run({ tool_name: 'Write', tool_input: { command: 'sudo x' } })).toBeNull();
  });
});
