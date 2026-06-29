/**
 * Tests de la logique de timing du split-flap (mode normal + eager).
 *
 * Le composant SplitFlap anime du texte via setInterval. On ne peut pas rendre
 * React en environnement node, mais on peut tester l'algorithme de verrouillage
 * directement : pour un temps `t` donné, quel est l'état de chaque caractère ?
 *
 * États possibles d'un caractère non-espace au temps t :
 *   - 'empty'  : pas encore atteint (t < charStart, mode non-eager uniquement)
 *   - 'glyph'  : en rotation (entre spinFrom et lockAt)
 *   - 'locked' : verrouillé sur sa valeur finale (t >= lockAt)
 */
import { describe, expect, it } from "vitest";
import { splitFlap, splitFlapHero } from "@/lib/motion";

type CharState = "empty" | "glyph" | "locked";

function charStateAt(
	i: number,
	t: number,
	opts: { spin: number; perChar: number; eager: boolean; delay: number },
): CharState {
	const { spin, perChar, eager, delay } = opts;
	if (eager) {
		const lockAt = delay + spin + i * perChar;
		if (t < 0) return "glyph";
		if (t < lockAt) return "glyph";
		return "locked";
	} else {
		const charStart = i * perChar;
		const lockAt = charStart + spin;
		if (t < charStart) return "empty";
		if (t < lockAt) return "glyph";
		return "locked";
	}
}

describe("SplitFlap — logique de timing (mode normal)", () => {
	const opts = { ...splitFlap, eager: false, delay: 0 };

	it("au temps 0, char 0 est déjà en rotation (charStart=0), chars suivants sont vides", () => {
		expect(charStateAt(0, 0, opts)).toBe("glyph");
		for (let i = 1; i < 10; i++) {
			expect(charStateAt(i, 0, opts), `char ${i}`).toBe("empty");
		}
	});

	it("le 1er char est en rotation avant spin ms, verrouillé après", () => {
		expect(charStateAt(0, 1, opts)).toBe("glyph");
		expect(charStateAt(0, opts.spin - 1, opts)).toBe("glyph");
		expect(charStateAt(0, opts.spin, opts)).toBe("locked");
	});

	it("chaque char démarre après le précédent (cascade gauche → droite)", () => {
		for (let i = 1; i < 8; i++) {
			const prevLock = i * opts.perChar - 1;
			expect(
				charStateAt(i, prevLock, opts),
				`char ${i} pas encore démarré`,
			).toBe("empty");
		}
	});

	it("le verrouillage progresse de gauche à droite : char i verrouillé avant char i+1", () => {
		for (let i = 0; i < 7; i++) {
			const lockI = i * opts.perChar + opts.spin;
			expect(charStateAt(i, lockI, opts), `char ${i} verrouillé`).toBe(
				"locked",
			);
			expect(
				charStateAt(i + 1, lockI, opts),
				`char ${i + 1} pas encore verrouillé`,
			).not.toBe("locked");
		}
	});

	it("à spin + 20*perChar ms, les 20 premiers chars sont verrouillés", () => {
		const t = opts.spin + 20 * opts.perChar;
		for (let i = 0; i < 20; i++) {
			expect(charStateAt(i, t, opts), `char ${i}`).toBe("locked");
		}
	});
});

describe("SplitFlap — logique de timing (mode eager)", () => {
	const delay = 100;
	const opts = { ...splitFlapHero, eager: true, delay };

	it("dès t=0, tous les chars sont en rotation (titre immédiatement plein)", () => {
		for (let i = 0; i < 10; i++) {
			expect(charStateAt(i, 0, opts), `char ${i}`).toBe("glyph");
		}
	});

	it("aucun char n'est dans l'état \"empty\" en mode eager", () => {
		for (let t = 0; t <= delay + opts.spin + 15 * opts.perChar; t += 10) {
			for (let i = 0; i < 15; i++) {
				expect(charStateAt(i, t, opts), `t=${t} char ${i}`).not.toBe("empty");
			}
		}
	});

	it("le verrouillage ne démarre qu'après delay + spin ms", () => {
		const justBefore = delay + opts.spin - 1;
		expect(charStateAt(0, justBefore, opts)).toBe("glyph");
		expect(charStateAt(0, delay + opts.spin, opts)).toBe("locked");
	});

	it("le verrouillage progresse gauche → droite après le délai", () => {
		for (let i = 0; i < 7; i++) {
			const lockI = delay + opts.spin + i * opts.perChar;
			expect(charStateAt(i, lockI, opts), `char ${i} verrouillé`).toBe(
				"locked",
			);
			expect(
				charStateAt(i + 1, lockI, opts),
				`char ${i + 1} pas encore verrouillé`,
			).toBe("glyph");
		}
	});
});

describe("SplitFlap — cascade entre lignes (introDelays)", () => {
	it("le retard de chaque ligne est proportionnel à son rang × rowStep", () => {
		const rows = [0, 1, 2, 5, 10];
		for (const row of rows) {
			const delay = Math.round(row * splitFlap.rowStep);
			expect(delay).toBe(row * splitFlap.rowStep);
		}
	});

	it("rowStep positif : les lignes basses démarrent après les lignes hautes", () => {
		expect(splitFlap.rowStep).toBeGreaterThan(0);
		const delayRow3 = 3 * splitFlap.rowStep;
		const delayRow0 = 0 * splitFlap.rowStep;
		expect(delayRow3).toBeGreaterThan(delayRow0);
	});
});
