// @vitest-environment node
// Tests groupés des hooks de journalisation (même contrat : construire une entrée + append).
import { describe, it, expect, vi } from 'vitest';
import { run as auditLog } from '../../.claude/hooks/audit-log.mjs';
import { run as bashCommandLog } from '../../.claude/hooks/bash-command-log.mjs';
import { run as configAuditLog } from '../../.claude/hooks/config-audit-log.mjs';
import { run as postToolFailureLog } from '../../.claude/hooks/post-tool-failure-log.mjs';
import { run as userPromptLog } from '../../.claude/hooks/user-prompt-log.mjs';
import { run as toolUsage } from '../../.claude/hooks/tool-usage.mjs';
import { run as permissionDeniedLog } from '../../.claude/hooks/permission-denied-auto-mode-log.mjs';
import { run as instructionsLoadedLog } from '../../.claude/hooks/instructions-loaded-audit-log.mjs';
import { run as stopFailureApiLog } from '../../.claude/hooks/stop-failure-log-api-errors.mjs';

const TS = '2026-06-02T00:00:00.000Z';
const base = () => ({ append: vi.fn(), mkdir: vi.fn(), now: () => TS, projectDir: '/proj', home: '/home' });

describe('audit-log', () => {
  it('construit et append une entrée de session', () => {
    const deps = base();
    const e = auditLog({ session_id: 's1', total_cost_usd: 0.5, num_turns: 3 }, deps);
    expect(e).toMatchObject({ timestamp: TS, project: 'proj', session_id: 's1', total_cost_usd: 0.5, num_turns: 3 });
    expect(deps.append).toHaveBeenCalledWith('/home/.claude/audit-log.jsonl', JSON.stringify(e) + '\n');
  });
});

describe('bash-command-log', () => {
  it('journalise une commande', () => {
    const deps = { ...base(), cwd: '/proj' };
    const e = bashCommandLog({ tool_input: { command: 'ls' }, tool_response: { exit_code: 0 } }, deps);
    expect(e).toMatchObject({ ts: TS, cmd: 'ls', exit: 0, cwd: '/proj' });
    expect(deps.append).toHaveBeenCalled();
  });
  it('ignore une commande vide', () => {
    const deps = base();
    expect(bashCommandLog({ tool_input: {} }, deps)).toBeNull();
    expect(deps.append).not.toHaveBeenCalled();
  });
  it('tronque les commandes longues à 1000 car.', () => {
    const e = bashCommandLog({ tool_input: { command: 'x'.repeat(2000) } }, base());
    expect(e.cmd.length).toBe(1000);
  });
});

describe('config-audit-log', () => {
  it('journalise un changement de config', () => {
    const deps = base();
    const { entry, message } = configAuditLog({ change: { theme: 'dark' } }, deps);
    expect(entry).toMatchObject({ ts: TS, project: 'proj', change: { theme: 'dark' } });
    expect(message).toContain('config-audit');
    expect(deps.append).toHaveBeenCalled();
  });
});

describe('post-tool-failure-log', () => {
  it('journalise un échec d\'outil', () => {
    const deps = base();
    const { entry } = postToolFailureLog({ tool_name: 'Bash', tool_input: { command: 'x' }, error: 'boom' }, deps);
    expect(entry).toMatchObject({ ts: TS, tool: 'Bash', error: 'boom' });
    expect(deps.append).toHaveBeenCalled();
  });
});

describe('user-prompt-log', () => {
  it('crée une nouvelle session avec le prompt', () => {
    const deps = { ...base(), exists: () => false, writeFile: vi.fn() };
    const data = userPromptLog({ session_id: 's1', prompt: 'hello' }, deps);
    expect(data.prompts).toHaveLength(1);
    expect(data.prompts[0]).toMatchObject({ prompt: 'hello', timestamp: TS });
    expect(deps.writeFile).toHaveBeenCalled();
  });
  it('append au tableau existant', () => {
    const deps = {
      ...base(),
      exists: () => true,
      readFile: () => JSON.stringify({ session_id: 's1', prompts: [{ prompt: 'a' }] }),
      writeFile: vi.fn(),
    };
    const data = userPromptLog({ session_id: 's1', prompt: 'b' }, deps);
    expect(data.prompts).toHaveLength(2);
  });
});

describe('tool-usage', () => {
  it('journalise une commande (tronquée à 500)', () => {
    const e = toolUsage({ tool_input: { command: 'y'.repeat(800) } }, base());
    expect(e.cmd.length).toBe(500);
  });
  it('ignore une commande vide', () => {
    expect(toolUsage({ tool_input: {} }, base())).toBeNull();
  });
});

describe('permission-denied-auto-mode-log', () => {
  it('construit une ligne avec outil et raison', () => {
    const deps = base();
    const line = permissionDeniedLog({ tool_name: 'Bash', tool_input: { command: 'rm' }, reason: 'denied' }, deps);
    expect(line).toContain('Bash');
    expect(line).toContain('denied');
    expect(deps.append).toHaveBeenCalledWith('/proj/.claude/permission-denied.log', line);
  });
});

describe('instructions-loaded-audit-log', () => {
  it('construit une ligne d\'audit', () => {
    const line = instructionsLoadedLog({ memory_type: 'project', load_reason: 'startup', file_path: 'CLAUDE.md' }, base());
    expect(line).toContain('project');
    expect(line).toContain('CLAUDE.md');
  });
});

describe('stop-failure-log-api-errors', () => {
  it('construit une ligne d\'erreur API', () => {
    const line = stopFailureApiLog({ error: 'rate_limit', error_details: '429', session_id: 's1' }, base());
    expect(line).toContain('rate_limit');
    expect(line).toContain('session:s1');
  });
});
