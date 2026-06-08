// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/pre-read-json-csv-compact.mjs';

const bigJson = (n) => JSON.stringify(Array.from({ length: n }, (_, i) => ({ id: i, name: `user_${i}`, email: `u${i}@x.com` })));
const bigCsv = (n) => ['id,name,email', ...Array.from({ length: n }, (_, i) => `${i},user_${i},u${i}@x.com`)].join('\n');
const bigJsonl = (n) => Array.from({ length: n }, (_, i) => JSON.stringify({ id: i, val: i * 2 })).join('\n');

function makeDeps(content, size = 100_000) {
  return {
    readFile: vi.fn(() => content),
    exists: vi.fn(() => true),
    stat: vi.fn(() => ({ size })),
  };
}

describe('pre-read-json-csv-compact', () => {
  it('laisse passer si tool_name != Read', () => {
    expect(run({ tool_name: 'Write', tool_input: { file_path: 'data.json' } })).toBeNull();
  });

  it('laisse passer si extension non supportée', () => {
    expect(run({ tool_name: 'Read', tool_input: { file_path: 'file.ts' } })).toBeNull();
  });

  it("laisse passer si le fichier n'existe pas", () => {
    const deps = { readFile: vi.fn(), exists: vi.fn(() => false), stat: vi.fn(() => ({ size: 100_000 })) };
    expect(run({ tool_name: 'Read', tool_input: { file_path: 'big.json' } }, deps)).toBeNull();
  });

  it('laisse passer si fichier petit (< seuil)', () => {
    const content = JSON.stringify([{ id: 1 }]);
    const deps = makeDeps(content, 100);
    expect(run({ tool_name: 'Read', tool_input: { file_path: 'small.json' } }, deps)).toBeNull();
  });

  it('résume un grand tableau JSON', () => {
    const content = bigJson(300);
    const deps = makeDeps(content);
    const result = run({ tool_name: 'Read', tool_input: { file_path: '/tmp/users.json' } }, deps);
    expect(result?.decision).toBe('block');
    expect(result?.reason).toContain('users.json');
    expect(result?.reason).toContain('300 items');
    expect(result?.reason).toContain('id');
  });

  it('résume un grand objet JSON', () => {
    const obj = Object.fromEntries(Array.from({ length: 300 }, (_, i) => [`key${i}`, i]));
    const content = JSON.stringify(obj, null, 2);
    const deps = makeDeps(content);
    const result = run({ tool_name: 'Read', tool_input: { file_path: '/tmp/config.json' } }, deps);
    expect(result?.decision).toBe('block');
    expect(result?.reason).toContain('config.json');
  });

  it('résume un grand CSV', () => {
    const content = bigCsv(300);
    const deps = makeDeps(content);
    const result = run({ tool_name: 'Read', tool_input: { file_path: '/tmp/data.csv' } }, deps);
    expect(result?.decision).toBe('block');
    expect(result?.reason).toContain('data.csv');
    expect(result?.reason).toContain('300 rows');
    expect(result?.reason).toContain('id,name,email');
  });

  it('résume un grand JSONL', () => {
    const content = bigJsonl(300);
    const deps = makeDeps(content);
    const result = run({ tool_name: 'Read', tool_input: { file_path: '/tmp/events.jsonl' } }, deps);
    expect(result?.decision).toBe('block');
    expect(result?.reason).toContain('events.jsonl');
    expect(result?.reason).toContain('300 lines');
  });

  it('laisse passer si JSON invalide', () => {
    const content = 'not json\n'.repeat(300);
    const deps = makeDeps(content);
    expect(run({ tool_name: 'Read', tool_input: { file_path: '/tmp/bad.json' } }, deps)).toBeNull();
  });
});
