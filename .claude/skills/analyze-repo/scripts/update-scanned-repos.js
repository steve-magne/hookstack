#!/usr/bin/env node
// Met à jour registry/scanned-repos.json après un scan de dépôt.
// usage: update-scanned-repos.js <scanned-repos.json> <url> <hooks_found> <hooks_added> [status]
import { readFileSync, writeFileSync } from "node:fs";

const [, , scannedFile, url, hooksFound, hooksAdded, status = "success"] =
	process.argv;
if (!scannedFile || !url) {
	console.error(
		"usage: update-scanned-repos.js <scanned-repos.json> <url> <hooks_found> <hooks_added> [status]",
	);
	process.exit(1);
}

const repos = JSON.parse(readFileSync(scannedFile, "utf8"));

// Extrait un nom lisible selon le type de source
const isGitHub = url.includes("github.com");
const name = isGitHub
	? url
			.replace(/^https?:\/\/github\.com\//, "")
			.replace(/\.git$/, "")
			.replace(/\/$/, "")
	: (() => {
			try {
				const u = new URL(url);
				return u.hostname + u.pathname.replace(/\/$/, "");
			} catch {
				return url;
			}
		})();

const entry = {
	url: url.replace(/\.git$/, ""),
	name,
	scanned_at: new Date().toISOString(),
	hooks_found: parseInt(hooksFound ?? "0", 10),
	hooks_added: parseInt(hooksAdded ?? "0", 10),
	status,
};

const idx = repos.findIndex((r) => r.url === entry.url || r.name === name);
if (idx >= 0) {
	repos[idx] = entry;
	console.log(
		`Mise à jour : ${name} (${entry.hooks_found} hooks trouvés, ${entry.hooks_added} ajoutés)`,
	);
} else {
	repos.push(entry);
	console.log(
		`Ajout : ${name} (${entry.hooks_found} hooks trouvés, ${entry.hooks_added} ajoutés)`,
	);
}

writeFileSync(scannedFile, `${JSON.stringify(repos, null, 2)}\n`);
