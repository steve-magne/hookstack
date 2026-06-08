// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { run } from '../../.claude/hooks/file-to-markdown.mjs';

describe('file-to-markdown', () => {
  const mockExec = vi.fn();
  const mockExists = vi.fn();

  beforeEach(() => {
    mockExec.mockReset();
    mockExists.mockReset().mockReturnValue(true);
  });

  it('laisse passer si tool_name != Read', () => {
    expect(run({ tool_name: 'Write', tool_input: { file_path: 'doc.pdf' } }, { exec: mockExec, exists: mockExists })).toBeNull();
  });

  it('laisse passer si extension non supportée', () => {
    expect(run({ tool_name: 'Read', tool_input: { file_path: 'file.ts' } }, { exec: mockExec, exists: mockExists })).toBeNull();
  });

  it('laisse passer si tool_input absent', () => {
    expect(run({ tool_name: 'Read' }, { exec: mockExec, exists: mockExists })).toBeNull();
  });

  it("laisse passer si le fichier n'existe pas", () => {
    mockExists.mockReturnValue(false);
    expect(run({ tool_name: 'Read', tool_input: { file_path: 'doc.pdf' } }, { exec: mockExec, exists: mockExists })).toBeNull();
  });

  it('laisse passer si aucun outil disponible', () => {
    mockExec.mockImplementation(() => { throw new Error('not found'); });
    expect(run({ tool_name: 'Read', tool_input: { file_path: 'doc.pdf' } }, { exec: mockExec, exists: mockExists })).toBeNull();
  });

  it('convertit un PDF avec pdftotext', () => {
    mockExec.mockImplementation((cmd) => {
      if (cmd === 'which pdftotext') return '/usr/bin/pdftotext';
      if (cmd.startsWith('pdftotext')) return '# Hello World\n\nContenu du PDF.';
      throw new Error('not found');
    });
    const result = run({ tool_name: 'Read', tool_input: { file_path: '/tmp/doc.pdf' } }, { exec: mockExec, exists: mockExists });
    expect(result?.decision).toBe('block');
    expect(result?.reason).toContain('doc.pdf');
    expect(result?.reason).toContain('# Hello World');
  });

  it('convertit un DOCX avec pandoc', () => {
    mockExec.mockImplementation((cmd) => {
      if (cmd === 'which pandoc') return '/usr/bin/pandoc';
      if (cmd === 'which pdftotext') throw new Error('not found');
      if (cmd.startsWith('pandoc')) return '# Titre\n\nContenu du document Word.';
      throw new Error('not found');
    });
    const result = run({ tool_name: 'Read', tool_input: { file_path: '/tmp/rapport.docx' } }, { exec: mockExec, exists: mockExists });
    expect(result?.decision).toBe('block');
    expect(result?.reason).toContain('rapport.docx');
    expect(result?.reason).toContain('Contenu du document Word');
  });

  it('convertit un PPTX avec pandoc', () => {
    mockExec.mockImplementation((cmd) => {
      if (cmd === 'which pandoc') return '/usr/bin/pandoc';
      if (cmd.startsWith('pandoc')) return '## Slide 1\n\nContenu de la présentation.';
      throw new Error('not found');
    });
    const result = run({ tool_name: 'Read', tool_input: { file_path: '/tmp/slides.pptx' } }, { exec: mockExec, exists: mockExists });
    expect(result?.decision).toBe('block');
    expect(result?.reason).toContain('slides.pptx');
    expect(result?.reason).toContain('Slide 1');
  });

  it('utilise pandoc comme fallback PDF si pdftotext absent', () => {
    mockExec.mockImplementation((cmd) => {
      if (cmd === 'which pandoc') return '/usr/bin/pandoc';
      if (cmd === 'which pdftotext') throw new Error('not found');
      if (cmd.startsWith('pandoc')) return '# PDF via pandoc';
      throw new Error('not found');
    });
    const result = run({ tool_name: 'Read', tool_input: { file_path: '/tmp/doc.pdf' } }, { exec: mockExec, exists: mockExists });
    expect(result?.decision).toBe('block');
    expect(result?.reason).toContain('PDF via pandoc');
  });

  it('tronque le contenu si trop long', () => {
    mockExec.mockImplementation((cmd) => {
      if (cmd === 'which pandoc') return '/usr/bin/pandoc';
      if (cmd.startsWith('pandoc')) return 'a'.repeat(60_000);
      throw new Error('not found');
    });
    const result = run({ tool_name: 'Read', tool_input: { file_path: '/tmp/gros.docx' } }, { exec: mockExec, exists: mockExists });
    expect(result?.reason).toContain('truncated');
    expect(result?.reason.length).toBeLessThan(55_000);
  });

  it('laisse passer si la conversion échoue', () => {
    mockExec.mockImplementation((cmd) => {
      if (cmd === 'which pandoc') return '/usr/bin/pandoc';
      if (cmd.startsWith('pandoc')) throw new Error('pandoc error');
      throw new Error('not found');
    });
    expect(run({ tool_name: 'Read', tool_input: { file_path: '/tmp/bad.docx' } }, { exec: mockExec, exists: mockExists })).toBeNull();
  });

  it('laisse passer si le résultat est vide', () => {
    mockExec.mockImplementation((cmd) => {
      if (cmd === 'which pandoc') return '/usr/bin/pandoc';
      if (cmd.startsWith('pandoc')) return '   ';
      throw new Error('not found');
    });
    expect(run({ tool_name: 'Read', tool_input: { file_path: '/tmp/empty.docx' } }, { exec: mockExec, exists: mockExists })).toBeNull();
  });

  it('supporte epub', () => {
    mockExec.mockImplementation((cmd) => {
      if (cmd === 'which pandoc') return '/usr/bin/pandoc';
      if (cmd.startsWith('pandoc')) return '# Chapitre 1\n\nContenu.';
      throw new Error('not found');
    });
    const result = run({ tool_name: 'Read', tool_input: { file_path: '/tmp/livre.epub' } }, { exec: mockExec, exists: mockExists });
    expect(result?.decision).toBe('block');
  });
});
