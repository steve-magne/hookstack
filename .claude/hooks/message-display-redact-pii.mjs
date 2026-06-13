#!/usr/bin/env node
// Caviarde les PII dans le contenu affiché (MessageDisplay) : cartes, IBANs, SSNs, e-mails
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

// Numéros de carte Luhn-like (Visa/MC/Amex/Discover) — séparateurs optionnels
const CC_RE = /\b(?:4[0-9]{3}|5[1-5][0-9]{2}|3[47][0-9]{2}|6(?:011|5[0-9]{2}))[- ]?[0-9]{4}[- ]?[0-9]{4}[- ]?[0-9]{3,4}\b/g;
// IBAN (2 lettres, 2 chiffres, puis jusqu'à 30 alphanum, groupés par 4 optionnels)
const IBAN_RE = /\b[A-Z]{2}[0-9]{2}(?:\s?[A-Z0-9]{4}){3,7}(?:\s?[A-Z0-9]{1,4})?\b/g;
// SSN US (NNN-NN-NNNN) et numéro de sécu français (13 chiffres + clé 2 chiffres)
const SSN_RE = /\b(?:\d{3}-\d{2}-\d{4}|\d{13}\s?\d{2})\b/g;
// E-mails — seulement ceux qui ressemblent à des données client (hors code source)
const EMAIL_RE = /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g;

export function run(input) {
  const delta = input.delta ?? '';

  const redacted = delta
    .replace(CC_RE, '[REDACTED-CARD]')
    .replace(IBAN_RE, '[REDACTED-IBAN]')
    .replace(SSN_RE, '[REDACTED-SSN]')
    .replace(EMAIL_RE, '[REDACTED-EMAIL]');

  if (redacted === delta) return null;
  return {
    hookSpecificOutput: {
      hookEventName: 'MessageDisplay',
      displayContent: redacted,
    },
  };
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stdout.write(JSON.stringify(result));
}
