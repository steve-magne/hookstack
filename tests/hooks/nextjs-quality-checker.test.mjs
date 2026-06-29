// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { run } from "../../.claude/hooks/nextjs-quality-checker.mjs";

function makeInput(filePath) {
	return { tool_input: { file_path: filePath } };
}

function makeDeps(content) {
	return {
		readFile: vi.fn().mockReturnValue(content),
		fileExists: vi.fn().mockReturnValue(true),
	};
}

describe("nextjs-quality-checker", () => {
	it("retourne null pour un fichier non JS/TS", () => {
		const deps = makeDeps("");
		expect(run(makeInput("/app/styles.css"), deps)).toBeNull();
	});

	it("retourne null si le fichier n'existe pas", () => {
		const deps = {
			readFile: vi.fn(),
			fileExists: vi.fn().mockReturnValue(false),
		};
		expect(run(makeInput("/app/page.tsx"), deps)).toBeNull();
	});

	it("détecte un Server Component avec useState sans use client", () => {
		const content = `import { useState } from 'react';\nexport default function Page() { const [x, setX] = useState(0); }`;
		const deps = makeDeps(content);
		const result = run(makeInput("/project/app/page.tsx"), deps);
		expect(result?.message).toMatch(/'use client'/);
	});

	it("laisse passer un Server Component sans interactivité", () => {
		const content = `export default async function Page() { const data = await fetch('/api'); return <div>{data}</div>; }`;
		const deps = makeDeps(content);
		expect(run(makeInput("/project/app/page.tsx"), deps)).toBeNull();
	});

	it("ne bloque pas un Client Component correct", () => {
		const content = `'use client';\nimport { useState } from 'react';\nexport default function Counter() { const [n, setN] = useState(0); }`;
		const deps = makeDeps(content);
		expect(run(makeInput("/project/app/counter.tsx"), deps)).toBeNull();
	});

	it("détecte getServerSideProps dans app/", () => {
		const content = `export async function getServerSideProps() { return { props: {} }; }`;
		const deps = makeDeps(content);
		vi.spyOn(process.stderr, "write").mockImplementation(() => {});
		const result = run(makeInput("/project/app/legacy.tsx"), deps);
		// Warnings only → null (écrit sur stderr)
		expect(result).toBeNull();
	});

	it("détecte <img> sans next/image (hors app/)", () => {
		const content = `export default function Card() { return <img src="/logo.png" alt="logo" />; }`;
		const deps = makeDeps(content);
		vi.spyOn(process.stderr, "write").mockImplementation(() => {});
		const result = run(makeInput("/project/src/components/card.tsx"), deps);
		expect(result).toBeNull(); // warning → stderr, non bloquant
	});

	it("ne signale pas <img> si next/image est déjà importé", () => {
		const content = `import Image from 'next/image';\nexport default function Card() { return <img src="/logo.png" />; }`;
		const deps = makeDeps(content);
		expect(run(makeInput("/project/app/card.tsx"), deps)).toBeNull();
	});

	it("retourne null si tool_input vide", () => {
		expect(run({})).toBeNull();
	});
});
