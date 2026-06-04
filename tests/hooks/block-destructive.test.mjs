// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { run } from '../../.claude/hooks/block-destructive.mjs';

describe('block-destructive', () => {
  it('laisse passer une commande anodine', () => {
    expect(run({ tool_input: { command: 'ls -la' } })).toBeNull();
  });

  it('bloque rm -rf /', () => {
    const r = run({ tool_input: { command: 'rm -rf /' } });
    expect(r?.decision).toBe('block');
    expect(r?.reason).toContain('rm -rf /');
  });

  it('bloque force-push sur main', () => {
    const r = run({ tool_input: { command: 'git push --force origin main' } });
    expect(r?.decision).toBe('block');
  });

  it('bloque DROP TABLE', () => {
    expect(run({ tool_input: { command: 'DROP TABLE users' } })?.decision).toBe('block');
  });

  it('bloque chmod 777 récursif sur /', () => {
    expect(run({ tool_input: { command: 'chmod -R 777 /' } })?.decision).toBe('block');
  });

  it('laisse passer si tool_input absent', () => {
    expect(run({})).toBeNull();
  });

  // Nouveaux patterns
  it('bloque git reset --hard', () => {
    expect(run({ tool_input: { command: 'git reset --hard HEAD~1' } })?.decision).toBe('block');
  });

  it('bloque TRUNCATE TABLE', () => {
    expect(run({ tool_input: { command: 'TRUNCATE TABLE users' } })?.decision).toBe('block');
  });

  it('bloque mkfs', () => {
    expect(run({ tool_input: { command: 'mkfs.ext4 /dev/sdb1' } })?.decision).toBe('block');
  });

  it('bloque dd if=', () => {
    expect(run({ tool_input: { command: 'dd if=/dev/zero of=/dev/sda' } })?.decision).toBe('block');
  });

  // Faux positifs — mentions documentaires dans des arguments quotés
  it('laisse passer git commit -m avec mention documentaire', () => {
    expect(run({ tool_input: { command: 'git commit -m "docs: rm -rf * est dangereux"' } })).toBeNull();
  });

  it('laisse passer gh pr create --body mentionnant git reset', () => {
    expect(run({ tool_input: { command: 'gh pr create --body "extension: git reset --hard bloqué"' } })).toBeNull();
  });

  it('laisse passer echo avec pattern dans une string', () => {
    expect(run({ tool_input: { command: "echo 'TRUNCATE TABLE est interdit'" } })).toBeNull();
  });
});
