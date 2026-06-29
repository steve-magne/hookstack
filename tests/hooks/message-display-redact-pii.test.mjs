// @vitest-environment node
import { describe, expect, it } from "vitest";
import { run } from "../../.claude/hooks/message-display-redact-pii.mjs";

describe("message-display-redact-pii", () => {
	it("caviarde un numéro de carte Visa", () => {
		const r = run({ delta: "Card: 4111 1111 1111 1111 expiry 12/26" });
		expect(r?.hookSpecificOutput?.displayContent).toContain("[REDACTED-CARD]");
		expect(r?.hookSpecificOutput?.displayContent).not.toContain("4111");
	});

	it("caviarde un numéro de carte avec tirets", () => {
		const r = run({ delta: "Payment: 5500-0000-0000-0004" });
		expect(r?.hookSpecificOutput?.displayContent).toContain("[REDACTED-CARD]");
	});

	it("caviarde un IBAN français", () => {
		const r = run({ delta: "IBAN: FR76 3000 6000 0112 3456 7890 189" });
		expect(r?.hookSpecificOutput?.displayContent).toContain("[REDACTED-IBAN]");
	});

	it("caviarde un SSN américain", () => {
		const r = run({ delta: "SSN: 123-45-6789 — do not share" });
		expect(r?.hookSpecificOutput?.displayContent).toContain("[REDACTED-SSN]");
	});

	it("ne caviarde PAS les adresses e-mail (trop communes en contexte dev)", () => {
		const r = run({ delta: "Contact: john.doe@example.com for support" });
		expect(r).toBeNull();
	});

	it("caviarde plusieurs types de hard-PII dans un même delta", () => {
		const r = run({ delta: "Card 4111111111111111 SSN 123-45-6789" });
		const content = r?.hookSpecificOutput?.displayContent ?? "";
		expect(content).toContain("[REDACTED-CARD]");
		expect(content).toContain("[REDACTED-SSN]");
	});

	it("retourne null si aucun hard-PII détecté", () => {
		expect(
			run({ delta: "SELECT count(*) FROM orders WHERE status = 'pending'" }),
		).toBeNull();
	});

	it("retourne null si delta vide ou absent", () => {
		expect(run({ delta: "" })).toBeNull();
		expect(run({})).toBeNull();
	});
});
