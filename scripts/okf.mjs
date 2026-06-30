#!/usr/bin/env node
// OKF bundle CLI — retrieval, index generation, staleness, validation, graph.
// Zero dependency, pure Node ESM, portable (copy alongside the okf/ bundle).
// Usage: node scripts/okf.mjs <query|map|index|stale|validate|graph> [args]
// ponytail: minimal YAML parse — flat key/value + inline [a,b] lists only.

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, posix, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BUNDLE = join(ROOT, "okf");
const RESERVED = new Set(["index.md", "log.md"]);
const RECOMMENDED = ["title", "description", "tags", "timestamp"];

function walk(dir) {
	const out = [];
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		if (statSync(p).isDirectory()) out.push(...walk(p));
		else if (name.endsWith(".md")) out.push(p);
	}
	return out;
}

function parseFrontmatter(text) {
	if (!text.startsWith("---\n")) return null;
	const end = text.indexOf("\n---", 4);
	if (end === -1) return null;
	const fm = {};
	for (const line of text.slice(4, end).split("\n")) {
		const m = line.match(/^([A-Za-z_]+):\s*(.*)$/);
		if (!m) continue;
		let v = m[2].trim();
		if (v.startsWith("[") && v.endsWith("]"))
			v = v
				.slice(1, -1)
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);
		fm[m[1]] = v;
	}
	return fm;
}

function relOf(f) {
	return relative(BUNDLE, f).split("\\").join("/");
}

// Returns concepts: { id, file, rel, dir, fm }
function loadConcepts() {
	return walk(BUNDLE)
		.filter((f) => !RESERVED.has(basename(f)))
		.map((f) => {
			const rel = relOf(f);
			return {
				id: rel.replace(/\.md$/, ""),
				file: f,
				rel,
				dir: dirname(rel) === "." ? "" : dirname(rel),
				fm: parseFrontmatter(readFileSync(f, "utf8")) || {},
			};
		});
}

function titleOf(c) {
	return c.fm.title || basename(c.id).replace(/-/g, " ");
}

// Extract markdown link targets, skipping images and fenced code blocks.
function collectLinks(text) {
	const targets = [];
	let inFence = false;
	for (const line of text.split("\n")) {
		if (/^(```|~~~)/.test(line.trim())) {
			inFence = !inFence;
			continue;
		}
		if (inFence) continue;
		const re = /(?<!!)\[[^\]]*\]\(([^)\s]+)/g;
		let m = re.exec(line);
		while (m) {
			targets.push(m[1]);
			m = re.exec(line);
		}
	}
	return targets;
}

// Resolve a markdown link target to a bundle-relative path, or null if external/non-md.
function resolveTarget(fromRel, target) {
	const t = target.split("#")[0];
	if (!t || t.endsWith("/")) return null;
	if (/^[a-z][a-z0-9+.-]*:\/\//.test(t) || t.startsWith("mailto:")) return null;
	if (!t.endsWith(".md")) return null;
	if (t.startsWith("/")) return t.slice(1);
	return posix.normalize(posix.join(posix.dirname(fromRel), t));
}

// ---- commands ----

function cmdQuery(terms) {
	if (!terms.length) return fail("usage: okf query <termes...>");
	const concepts = loadConcepts();
	const scored = concepts
		.map((c) => {
			const title = (c.fm.title || "").toLowerCase();
			const desc = (c.fm.description || "").toLowerCase();
			const tags = (
				Array.isArray(c.fm.tags) ? c.fm.tags.join(" ") : ""
			).toLowerCase();
			const path = c.rel.toLowerCase();
			let score = 0;
			for (const t of terms.map((x) => x.toLowerCase())) {
				if (title.includes(t)) score += 3;
				if (tags.includes(t)) score += 2;
				if (desc.includes(t)) score += 2;
				if (path.includes(t)) score += 1;
			}
			return { c, score };
		})
		.filter((x) => x.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, 12);
	if (!scored.length) {
		console.log(
			`Aucun concept ne matche "${terms.join(" ")}". Voir: node scripts/okf.mjs map`,
		);
		return;
	}
	for (const { c, score } of scored)
		console.log(
			`[${score}] /${c.rel}  (${c.fm.type || "?"})  ${c.fm.description || ""}`,
		);
}

function cmdMap() {
	const byDir = {};
	for (const c of loadConcepts()) {
		const key = c.dir || "(racine)";
		byDir[key] = byDir[key] || [];
		byDir[key].push(c);
	}
	for (const dir of Object.keys(byDir).sort()) {
		console.log(`\n# ${dir}`);
		for (const c of byDir[dir].sort((a, b) => a.rel.localeCompare(b.rel)))
			console.log(
				`/${c.rel}  (${c.fm.type || "?"})  ${titleOf(c)} — ${c.fm.description || ""}`,
			);
	}
}

function cmdStale(days) {
	const threshold = Number(days) || 14;
	const log = readFileSync(join(BUNDLE, "log.md"), "utf8");
	const m = log.match(/^##\s*(\d{4}-\d{2}-\d{2})/m);
	if (!m) return fail("log.md: aucune date ## YYYY-MM-DD trouvée");
	const last = new Date(m[1]);
	const age = Math.floor((Date.now() - last.getTime()) / 86400000);
	if (age > threshold) {
		console.log(
			`STALE: derniere entree log.md = ${m[1]} (${age}j > ${threshold}j). Lancer une passe d'enrichissement (okf/meta/self-improvement.md).`,
		);
		process.exitCode = 2;
	} else {
		console.log(
			`OK: derniere entree log.md = ${m[1]} (${age}j <= ${threshold}j).`,
		);
	}
}

// Deterministic OKF v0.1 conformance check.
// Hard errors: §9.1 (frontmatter parseable) + §9.2 (type non vide).
// Soft (warnings, fatales seulement avec --strict): champs recommandés, liens
// cassés (§5.3 tolérés), frontmatter des fichiers réservés (§6/§7).
function cmdValidate(args) {
	const strict = args.includes("--strict");
	const asJson = args.includes("--json");
	const errors = [];
	const warnings = [];
	let concepts = 0;
	const allRel = new Set(walk(BUNDLE).map(relOf));

	for (const f of walk(BUNDLE)) {
		const rel = relOf(f);
		const base = basename(f);
		const text = readFileSync(f, "utf8");
		const fm = parseFrontmatter(text);
		const hasFm = text.startsWith("---\n");

		if (base === "index.md") {
			const isRoot = rel === "index.md";
			if (hasFm && !isRoot)
				warnings.push(
					`${rel}: §6 un index.md ne doit pas avoir de frontmatter`,
				);
			if (
				hasFm &&
				isRoot &&
				fm &&
				Object.keys(fm).some((k) => k !== "okf_version")
			)
				warnings.push(`${rel}: §11 seul okf_version est permis en frontmatter`);
			continue;
		}
		if (base === "log.md") {
			if (hasFm)
				warnings.push(`${rel}: §7 un log.md ne doit pas avoir de frontmatter`);
			for (const line of text.split("\n"))
				if (
					line.startsWith("## ") &&
					!/^\d{4}-\d{2}-\d{2}$/.test(line.slice(3).trim())
				)
					warnings.push(
						`${rel}: §7 en-tête de date non ISO 8601: "${line.slice(3).trim()}"`,
					);
			continue;
		}

		concepts++;
		if (!fm) {
			errors.push(`${rel}: §9.1 frontmatter YAML manquant ou non parseable`);
			continue;
		}
		if (!(typeof fm.type === "string" && fm.type.trim()))
			errors.push(`${rel}: §9.2 champ 'type' requis et non vide`);
		for (const k of RECOMMENDED)
			if (!(k in fm))
				warnings.push(`${rel}: champ recommandé '${k}' absent (§4.1)`);

		for (const target of collectLinks(text)) {
			const resolved = resolveTarget(rel, target);
			if (resolved && resolved !== rel && !allRel.has(resolved))
				warnings.push(`${rel}: lien cassé '${target}' (toléré §5.3)`);
		}
	}

	const conformant = errors.length === 0;
	const failed = errors.length > 0 || (strict && warnings.length > 0);

	if (asJson) {
		console.log(
			JSON.stringify(
				{
					bundle: "okf",
					conformant,
					passed: !failed,
					concepts,
					errors,
					warnings,
				},
				null,
				2,
			),
		);
	} else {
		for (const e of errors) console.log(`✗ ERROR  ${e}`);
		for (const w of warnings) console.log(`! warn   ${w}`);
		if (conformant && !warnings.length)
			console.log(
				`OK: bundle conforme OKF v0.1 (${concepts} concepts, aucun souci).`,
			);
		else if (conformant)
			console.log(
				`OK: conforme OKF v0.1 (${concepts} concepts, ${warnings.length} warning(s)).`,
			);
		else console.log(`✗ non-conforme (${errors.length} erreur(s)).`);
	}
	if (failed) process.exitCode = 1;
}

// Regenerate every subdirectory index.md and the nav block of the root index.md.
function cmdIndex() {
	const concepts = loadConcepts();
	const byDir = {};
	for (const c of concepts) {
		byDir[c.dir] = byDir[c.dir] || [];
		byDir[c.dir].push(c);
	}

	// Subdirectory listings (pure, no frontmatter per spec).
	for (const dir of Object.keys(byDir).filter(Boolean)) {
		const heading = dir
			.split("/")
			.pop()
			.replace(/-/g, " ")
			.replace(/^\w/, (x) => x.toUpperCase());
		const items = byDir[dir]
			.sort((a, b) => a.rel.localeCompare(b.rel))
			.map(
				(c) =>
					`* [${titleOf(c)}](${basename(c.rel)}) - ${c.fm.description || ""}`,
			);
		writeFileSync(
			join(BUNDLE, dir, "index.md"),
			`# ${heading}\n\n${items.join("\n")}\n`,
		);
	}

	// Root nav block between markers (preserves intro + okf_version above).
	const rootPath = join(BUNDLE, "index.md");
	const root = readFileSync(rootPath, "utf8");
	const START = "<!-- okf:nav:start -->";
	const END = "<!-- okf:nav:end -->";
	const nav = Object.keys(byDir)
		.filter(Boolean)
		.sort()
		.map((dir) => {
			const heading = dir
				.replace(/-/g, " ")
				.replace(/^\w/, (x) => x.toUpperCase());
			const lines = byDir[dir]
				.sort((a, b) => a.rel.localeCompare(b.rel))
				.map((c) => `* [${titleOf(c)}](${c.rel}) - ${c.fm.description || ""}`);
			return `## ${heading}\n\n${lines.join("\n")}`;
		})
		.join("\n\n");
	const block = `${START}\n\n${nav}\n\n${END}`;
	let next;
	if (root.includes(START) && root.includes(END))
		next = root.replace(new RegExp(`${START}[\\s\\S]*${END}`), block);
	else next = `${root.trimEnd()}\n\n${block}\n`;
	writeFileSync(rootPath, next);
	console.log(
		`Index regeneres: ${Object.keys(byDir).filter(Boolean).length} dossier(s) + nav racine.`,
	);
}

// Render the bundle to a self-contained interactive HTML graph (vis-network via CDN).
function cmdGraph(args) {
	let out = null;
	for (let i = 0; i < args.length; i++) if (args[i] === "-o") out = args[++i];
	const concepts = loadConcepts();
	const idset = new Set(concepts.map((c) => c.rel));
	const nodes = concepts.map((c) => ({
		id: c.rel,
		label: titleOf(c),
		type: c.fm.type || "?",
		dir: c.dir,
		description: c.fm.description || "",
	}));
	const edges = [];
	for (const c of concepts)
		for (const target of collectLinks(readFileSync(c.file, "utf8"))) {
			const r = resolveTarget(c.rel, target);
			if (r && r !== c.rel && idset.has(r)) edges.push({ from: c.rel, to: r });
		}
	const dest = out || join(BUNDLE, "graph.html");
	writeFileSync(dest, renderGraphHtml(nodes, edges));
	console.log(
		`Graphe: ${nodes.length} concepts, ${edges.length} liens -> ${dest}`,
	);
}

function renderGraphHtml(nodes, edges) {
	const data = JSON.stringify({ nodes, edges });
	return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>OKF — graphe de connaissance</title>
<script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
<style>
  :root{color-scheme:dark}
  body{margin:0;font:14px/1.5 system-ui,sans-serif;background:#0a0e14;color:#e6e6e6;display:flex;height:100vh}
  #net{flex:1;min-width:0}
  #side{width:340px;border-left:1px solid #1f2937;padding:16px;overflow:auto;background:#0d1219}
  h1{font-size:15px;margin:0 0 12px;color:#22d3ee}
  input,select{width:100%;box-sizing:border-box;background:#111827;color:#e6e6e6;border:1px solid #374151;border-radius:6px;padding:6px 8px;margin-bottom:8px}
  #legend span{display:inline-flex;align-items:center;gap:4px;margin:2px 8px 2px 0;font-size:12px}
  #legend i{width:10px;height:10px;border-radius:50%;display:inline-block}
  #detail{margin-top:12px;border-top:1px solid #1f2937;padding-top:12px}
  #detail .t{color:#f472b6;font-weight:600}
  #detail a{color:#22d3ee;text-decoration:none;display:block;margin:2px 0}
  .muted{color:#6b7280}
</style></head>
<body>
<div id="net"></div>
<div id="side">
  <h1>OKF — graphe</h1>
  <input id="q" placeholder="Rechercher un concept…">
  <select id="layout"><option value="hier">Disposition hiérarchique</option><option value="force">Disposition libre (force)</option></select>
  <div id="legend"></div>
  <div id="detail" class="muted">Cliquer un nœud pour le détail.</div>
</div>
<script>
const DATA = ${data};
const PALETTE = ["#22d3ee","#f472b6","#a78bfa","#34d399","#fbbf24","#60a5fa","#fb7185","#4ade80","#e879f9","#f59e0b"];
const types=[...new Set(DATA.nodes.map(n=>n.type))];
const color=t=>PALETTE[types.indexOf(t)%PALETTE.length];
const byId=Object.fromEntries(DATA.nodes.map(n=>[n.id,n]));
const visNodes=new vis.DataSet(DATA.nodes.map(n=>({id:n.id,label:n.label,color:color(n.type),shape:"dot",size:14,font:{color:"#e6e6e6"}})));
const visEdges=new vis.DataSet(DATA.edges.map((e,i)=>({id:i,from:e.from,to:e.to,arrows:"to",color:{color:"#374151",highlight:"#22d3ee"}})));
const container=document.getElementById("net");
function opts(layout){return{physics:layout==="force",layout:layout==="hier"?{hierarchical:{enabled:true,direction:"UD",sortMethod:"directed",levelSeparation:120,nodeSpacing:160}}:{},interaction:{hover:true,tooltipDelay:120}};}
let net=new vis.Network(container,{nodes:visNodes,edges:visEdges},opts("hier"));
document.getElementById("layout").onchange=e=>{net.setOptions(opts(e.target.value));};
const legend=document.getElementById("legend");
legend.innerHTML=types.map(t=>'<span><i style="background:'+color(t)+'"></i>'+t+'</span>').join("");
const detail=document.getElementById("detail");
function show(id){const n=byId[id];if(!n){detail.className="muted";detail.textContent="—";return;}
  const outs=DATA.edges.filter(e=>e.from===id).map(e=>'<a href="#" data-id="'+e.to+'">→ '+(byId[e.to]?.label||e.to)+'</a>').join("")||'<span class="muted">aucun</span>';
  const ins=DATA.edges.filter(e=>e.to===id).map(e=>'<a href="#" data-id="'+e.from+'">← '+(byId[e.from]?.label||e.from)+'</a>').join("")||'<span class="muted">aucun</span>';
  detail.className="";detail.innerHTML='<div class="t">'+n.label+'</div><div class="muted">'+n.type+' · /'+n.id+'</div><p>'+(n.description||'')+'</p><b>Liens sortants</b>'+outs+'<b>Cité par</b>'+ins;
  detail.querySelectorAll("a[data-id]").forEach(a=>{a.onclick=ev=>{ev.preventDefault();net.selectNodes([a.dataset.id]);net.focus(a.dataset.id,{scale:1.1,animation:true});show(a.dataset.id);};});}
net.on("click",p=>{if(p.nodes.length)show(p.nodes[0]);});
document.getElementById("q").oninput=e=>{const q=e.target.value.toLowerCase();if(!q)return;const hit=DATA.nodes.find(n=>n.label.toLowerCase().includes(q)||n.id.toLowerCase().includes(q));if(hit){net.selectNodes([hit.id]);net.focus(hit.id,{scale:1.1,animation:true});show(hit.id);}};
</script>
</body></html>
`;
}

function fail(msg) {
	console.error(msg);
	process.exitCode = 1;
}

const [cmd, ...rest] = process.argv.slice(2);
const commands = {
	query: () => cmdQuery(rest),
	map: cmdMap,
	index: cmdIndex,
	stale: () => cmdStale(rest[0]),
	validate: () => cmdValidate(rest),
	graph: () => cmdGraph(rest),
};
if (commands[cmd]) commands[cmd]();
else
	fail(
		`commandes: query <termes> | map | index | stale [jours] | validate [--strict] [--json] | graph [-o fichier.html]`,
	);
