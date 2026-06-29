#!/usr/bin/env node
// @hookstack message-display-redact-pii
// Caviarde le hard-PII dans le contenu affiché (MessageDisplay) :
// numéros de cartes, IBANs, SSNs — jamais présents dans du code légitime.
// Les e-mails sont exclus volontairement (trop fréquents en contexte dev).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Numéros de carte Visa/MC/Amex/Discover — séparateurs optionnels espace ou tiret
const CC_RE =
	/\b(?:4[0-9]{3}|5[1-5][0-9]{2}|3[47][0-9]{2}|6(?:011|5[0-9]{2}))[- ]?[0-9]{4}[- ]?[0-9]{4}[- ]?[0-9]{3,4}\b/g;
// IBAN : 2 lettres, 2 chiffres de contrôle, puis blocs alphanum groupés
const IBAN_RE =
	/\b[A-Z]{2}[0-9]{2}(?:\s?[A-Z0-9]{4}){3,7}(?:\s?[A-Z0-9]{1,4})?\b/g;
// SSN US (NNN-NN-NNNN) et numéro de sécu français (13 chiffres + clé 2 chiffres)
const SSN_RE = /\b(?:\d{3}-\d{2}-\d{4}|\d{13}\s?\d{2})\b/g;

export function run(input) {
	const delta = input.delta ?? "";

	const redacted = delta
		.replace(CC_RE, "[REDACTED-CARD]")
		.replace(IBAN_RE, "[REDACTED-IBAN]")
		.replace(SSN_RE, "[REDACTED-SSN]");

	if (redacted === delta) return null;
	return {
		hookSpecificOutput: {
			hookEventName: "MessageDisplay",
			displayContent: redacted,
		},
	};
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const input = JSON.parse(readFileSync(0, "utf8"));
	const result = run(input);
	if (result) process.stdout.write(JSON.stringify(result));
}
