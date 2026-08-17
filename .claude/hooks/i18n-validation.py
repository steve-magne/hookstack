#!/usr/bin/env python3
# @hookstack stop-i18n-validation
"""Validates the consistency of translation files (Stop)."""
import json
import os
import re
import sys

# Répertoires exclus du parcours : lourds et sans traduction.
# `.claude` contient les worktrees (copies complètes du repo) — principal coupable du timeout.
SKIP_DIRS = {
    "node_modules",
    ".git",
    ".claude",
    ".next",
    ".turbo",
    ".sveltekit",
    "dist",
    "build",
    ".cache",
    "coverage",
    ".worktrees",
}

# Segment de chemin qui marque un dossier de traduction : conventions web
# (locales/messages/i18n/translations/lang/l10n), GNU gettext (po, LC_MESSAGES),
# Apple (*.lproj). Android `values*` et Qt `translations/*.ts` par nom de fichier.
I18N_DIR_PATH = re.compile(
    r"(?:^|[/\\])(?:locales?|messages?|translations?|langs?|l10n|i18n|po|LC_MESSAGES|[^/\\]*\.lproj)[/\\]",
    re.IGNORECASE,
)

# Dossier Android comparable : `values` ou `values-<locale>`. Les qualifiers
# non-locale (values-night, values-land, values-sw600dp, values-v21…) sont exclus.
ANDROID_VALUES_RE = re.compile(r"^values(?:-[a-z]{2,3}(?:-[A-Za-z]{2,8})*)?$", re.IGNORECASE)

# Dernier segment de chemin qui ressemble à une locale (fr, en-US, pt_BR…).
LOCALE_SEG = re.compile(r"^[a-z]{2,3}(?:[-_][a-z0-9]{2,8})*$", re.IGNORECASE)

# Noms de dossiers de traduction connus — ne jamais les traiter comme une locale
# (ex. `po` matcherait LOCALE_SEG et casserait le groupement de po/fr.po).
I18N_SEG = re.compile(
    r"^(?:locales?|messages?|translations?|langs?|l10n|i18n|po|LC_MESSAGES|[^/\\]*\.lproj)$",
    re.IGNORECASE,
)

# Extensions de fichiers de traduction sans ambiguïté, où qu'ils soient.
I18N_EXT = re.compile(r"\.(?:po|pot|ftl|arb|strings)$", re.IGNORECASE)

# Noms de fichiers de traduction sans ambiguïté (Android, bundles Java).
I18N_FILE = re.compile(r"^(?:strings\.xml|messages.*\.properties)$", re.IGNORECASE)


def classify_file(rel):
    """Classe un chemin relatif (sans './' initial) en fichier de traduction.

    Retourne {"rel", "kind", "group"} ou None. `kind` pilote l'extraction des
    clés ; `group` décide quels fichiers sont comparés entre eux.
    """
    clean = re.sub(r"^\./", "", rel)
    slash = clean.rfind("/")
    dirname = clean[:slash] if slash != -1 else ""
    base = clean[slash + 1 :] if slash != -1 else clean
    dot = base.rfind(".")
    ext = base[dot + 1 :].lower() if dot != -1 else ""

    kind = None
    if ext == "json":
        if I18N_DIR_PATH.search(f"/{dirname}/"):
            kind = "json"
    elif ext == "arb":
        kind = "arb"  # Flutter : l'extension n'est utilisée que pour les ARB
    elif ext in ("po", "pot"):
        kind = "po"  # GNU gettext
    elif ext == "ftl":
        kind = "ftl"  # Project Fluent
    elif ext == "strings":
        kind = "strings"  # Apple
    elif ext == "xml" and base == "strings.xml":
        segs = [s for s in dirname.split("/") if s and s != "."]
        last = segs[-1] if segs else ""
        if ANDROID_VALUES_RE.search(last):
            kind = "android"
    elif ext == "properties":
        # Bundles Java : sous un dossier i18n ou nommés messages*/MessagesBundle*
        if I18N_DIR_PATH.search(f"/{dirname}/") or I18N_FILE.search(base):
            kind = "properties"
    elif ext == "ts" and I18N_DIR_PATH.search(f"/{dirname}/"):
        kind = "qt"  # Qt Linguist — jamais hors dossier i18n (collision avec .ts)
    if kind is None:
        return None
    return {"rel": rel, "kind": kind, "group": group_of(dirname, base, kind)}


def group_of(dirname, base, kind):
    segs = [s for s in dirname.split("/") if s and s != "."]
    last = segs[-1] if segs else ""
    if kind == "android":
        # res/values/strings.xml + res/values-fr/strings.xml → même groupe,
        # modules Android distincts → groupes distincts.
        agnostic = re.sub(r"/values(?:-[^/]*)?$", "", dirname, flags=re.IGNORECASE)
        return f"base:{agnostic}/{base}"
    if re.search(r"\.lproj$", last, re.IGNORECASE) or re.search(
        r"^LC_MESSAGES$", last, re.IGNORECASE
    ):
        # La locale est dans le dossier : *.lproj (Apple), <locale>/LC_MESSAGES (gettext)
        idx = len(segs) - 1
        if (
            re.search(r"^LC_MESSAGES$", segs[idx], re.IGNORECASE)
            and idx > 0
            and LOCALE_SEG.search(segs[idx - 1])
        ):
            idx -= 1
        return f"base:{'/'.join(segs[:idx])}/{base}"
    if LOCALE_SEG.search(last) and not I18N_SEG.search(last):
        # Dossiers par-locale : locales/fr/common.json vs locales/en/common.json
        return f"dirbase:{'/'.join(segs[:-1])}/{base}"
    return f"dir:{dirname}"


# ── Extraction des clés par format ──────────────────────────────────────────


def po_keys(content):
    """GNU gettext : msgid (éventuellement msgid_plural), multiligne via "...".
    L'en-tête du fichier (premier bloc déclaré `msgid ""`) est ignoré.
    Un `msgctxt` préfixe la clé (contexte + EOT \x04, comme gettext) : deux
    msgid identiques sous des contextes différents deviennent des clés distinctes."""
    keys = set()
    current = None  # msgid en cours (None = hors bloc)
    plural = None  # msgid_plural du bloc (conserve le même contexte)
    prefix = ""  # contexte capturé au début du bloc + "\u0004"
    mode = None  # "context" | "msgid" | "plural" — lignes de continuation
    first = True
    skip_block = False  # seul le premier bloc `msgid ""` (en-tête) est ignoré

    def add_id(id_):
        if id_ is not None and id_ != "" and not skip_block:
            keys.add(f"{prefix}{id_}")

    def flush():
        nonlocal current, plural, prefix, mode, skip_block
        add_id(current)
        add_id(plural)
        current = None
        plural = None
        prefix = ""
        mode = None
        skip_block = False

    for raw in content.split("\n"):
        line = raw.strip()
        if line.startswith("msgctxt"):
            flush()  # clôt tout bloc précédent (le msgctxt ouvre un nouveau contexte)
            m = re.match(r'^msgctxt\s*("(?:[^"\\]|\\.)*")?', line)
            ctx = m.group(1)[1:-1] if m and m.group(1) else ""
            prefix = f"{ctx}\u0004" if ctx else ""
            mode = "context"
            continue
        if mode == "context" and line.startswith('"'):
            m = re.match(r'^"((?:[^"\\]|\\.)*)"', line)
            if m:
                prefix = f"{prefix[:-1] if prefix else ''}{m.group(1)}\u0004"
            continue
        if re.match(r"^msgid_plural", line):
            # Même bloc que msgid : on ajoute le msgid capturé, le pluriel
            # garde le même préfixe de contexte.
            m = re.match(r'^msgid_plural\s*("(?:[^"\\]|\\.)*")?', line)
            add_id(current)
            current = None
            plural = m.group(1)[1:-1] if m and m.group(1) else ""
            mode = "plural"
            continue
        if re.match(r"^msgid", line):
            # Ne flushe que si un bloc est réellement ouvert : un msgctxt qui
            # vient d'être lu a déjà clos le précédent et ne doit pas effacer
            # le préfixe.
            if current is not None or plural is not None:
                flush()
            m = re.match(r'^msgid\s*("(?:[^"\\]|\\.)*")?', line)
            current = m.group(1)[1:-1] if m and m.group(1) else ""
            mode = "msgid"
            if first:
                skip_block = current == ""
                first = False
            continue
        if mode is not None and line.startswith('"'):
            m = re.match(r'^"((?:[^"\\]|\\.)*)"', line)
            if not m:
                continue
            if mode == "msgid":
                current += m.group(1)
            elif mode == "plural":
                plural += m.group(1)
            continue
        if re.match(r"^msgstr", line):
            flush()
    flush()
    return keys


def ftl_keys(content):
    """Project Fluent : identifiants de premier niveau `name = …` / `name { … }`."""
    keys = set()
    for line in content.split("\n"):
        m = re.match(r"^([a-zA-Z][\w-]*)\s*(?:=|{)", line)
        if m:
            keys.add(m.group(1))
    return keys


def strings_keys(content):
    """Apple .strings : "clé" = "valeur";"""
    return {m.group(1) for m in re.finditer(r'^\s*"((?:[^"\\]|\\.)*)"\s*=\s*"', content, re.MULTILINE)}


def xml_string_keys(content):
    """Android strings.xml : <string|string-array|plurals name="…">."""
    return {m.group(1) for m in re.finditer(r'<(?:string|string-array|plurals)\b[^>]*\bname="([^"]+)"', content)}


def properties_keys(content):
    """Bundles Java .properties : key=value / key: value / key value,
    continuations de ligne (backslash final), commentaires # et !."""
    keys = set()

    def flush(logical):
        sep = re.search(r"[=:]", logical)
        if sep is None:
            ws = re.search(r"\s", logical)
            keys.add((logical[: ws.start()] if ws else logical).strip())
        else:
            keys.add(logical[: sep.start()].strip())

    pending = None
    for raw in content.split("\n"):
        line = raw.rstrip("\r")
        if pending is not None:
            pending += line
            if line.endswith("\\"):
                pending = pending[:-1]
                continue
            flush(pending)
            pending = None
            continue
        t = line.strip()
        if not t or t.startswith("#") or t.startswith("!"):
            continue
        if line.endswith("\\"):
            pending = line[:-1]
            continue
        flush(line)
    if pending is not None:
        flush(pending)
    return keys


def ts_keys(content):
    """Qt Linguist .ts (XML) : les <source> sont les clés de traduction."""
    keys = set()
    for m in re.finditer(r"<source>([^<]*)</source>", content):
        k = m.group(1).strip()
        if k:
            keys.add(k)
    return keys


def extract_keys(content, kind):
    """Extrait les clés de traduction d'un contenu selon le format détecté."""
    if kind == "json":
        return set(json.loads(content).keys())
    if kind == "arb":
        return {k for k in json.loads(content).keys() if not k.startswith("@@")}
    if kind == "po":
        return po_keys(content)
    if kind == "ftl":
        return ftl_keys(content)
    if kind == "strings":
        return strings_keys(content)
    if kind == "android":
        return xml_string_keys(content)
    if kind == "properties":
        return properties_keys(content)
    if kind == "qt":
        return ts_keys(content)
    return set()


def find_translation_files(project_dir, *, listdir=None, isdir=None, isfile=None):
    if listdir is None:
        listdir = os.listdir
    if isdir is None:
        isdir = os.path.isdir
    if isfile is None:
        isfile = os.path.isfile

    out = []

    def walk(d):
        try:
            names = listdir(d)
        except OSError:
            return
        for name in names:
            p = os.path.join(d, name)
            if isdir(p):
                if name in SKIP_DIRS:
                    continue
                walk(p)
            elif isfile(p):
                rel = os.path.relpath(p, project_dir).replace(os.sep, "/")
                classified = classify_file(rel)
                if classified:
                    out.append({**classified, "rel": f"./{rel}"})

    walk(project_dir)
    return out


def _read_file(path):
    with open(path, "r", encoding="utf8") as f:
        return f.read()


def run(
    *,
    exec_cmd=None,
    read_file=None,
    project_dir=None,
    listdir=None,
    isdir=None,
    isfile=None,
):
    if read_file is None:
        read_file = _read_file
    if project_dir is None:
        project_dir = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()

    # `exec_cmd` n'est utilisé que par les tests (mock) ; en production, parcours natif.
    try:
        if exec_cmd:
            files = []
            for line in exec_cmd("find . -print").split("\n"):
                line = line.strip()
                if not line:
                    continue
                c = classify_file(line)
                if c:
                    files.append(c)
        else:
            files = find_translation_files(
                project_dir, listdir=listdir, isdir=isdir, isfile=isfile
            )
    except Exception:
        # Un Stop hook non bloquant ne doit pas crasher (ex. ETIMEDOUT) — on rend la main.
        return None

    if len(files) < 2:
        return None

    # Groupe par clé locale-agnostique et vérifie la cohérence des clés
    by_group = {}
    for f in files:
        by_group.setdefault(f["group"], []).append(f)

    issues = []
    for group in by_group.values():
        if len(group) < 2:
            continue
        parsed = []
        for f in group:
            try:
                keys = extract_keys(read_file(os.path.join(project_dir, f["rel"])), f["kind"])
                parsed.append({"rel": f["rel"], "keys": keys})
            except Exception:
                continue

        all_keys = set()
        for p in parsed:
            all_keys.update(p["keys"])
        for p in parsed:
            missing = [k for k in all_keys if k not in p["keys"]]
            if missing:
                shown = ", ".join(missing[:5])
                suffix = "…" if len(missing) > 5 else ""
                issues.append(f"{p['rel']} manque {len(missing)} clé(s) : {shown}{suffix}")

    message = (
        "[i18n-validation] Incohérences détectées :\n"
        + "\n".join(f"  - {i}" for i in issues)
        + "\n"
        if issues
        else "[i18n-validation] ✓ Fichiers de traduction cohérents.\n"
    )

    return {"issues": issues, "message": message}


if __name__ == "__main__":
    result = run()
    if result:
        sys.stderr.write(result["message"])
