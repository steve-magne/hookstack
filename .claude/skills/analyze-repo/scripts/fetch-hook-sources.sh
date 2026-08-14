#!/usr/bin/env bash
# fetch-hook-sources.sh <github-url> [registry.json]
# Un seul appel — découverte + récupération des sources de hooks d'un dépôt GitHub.
# Layouts de config supportés (ordre de priorité pour la clé "hooks" principale) :
#   .claude/settings.json         — Claude Code classique (clé "hooks")
#   .claude/hooks.json / hooks.json — config hooks seule (racine)
#   hooks/hooks.json              — layout plugin/marketplace (commandes ${CLAUDE_PLUGIN_ROOT})
# Le fichier .claude/settings.local.json alimente hooks_local.
# Scripts collectés : .claude/hooks/* (toujours) + hooks/* si hooks/hooks.json existe
# (extensions code uniquement, hooks.json exclu).
# Sortie : JSON compact {repo, has_hooks, config_paths, hooks, hooks_local, hook_scripts, existing_slugs}

set -euo pipefail

URL="${1:-}"
REGISTRY="${2:-registry/registry.json}"

[[ -z "$URL" ]] && jq -n '{"error":"Usage: fetch-hook-sources.sh <github-url> [registry.json]"}' && exit 1

REPO=$(echo "$URL" | sed 's|https://github\.com/||;s|\.git$||;s|/$||')

# Phase 1 — un seul appel API pour l'arbre complet du dépôt
TREE=$(gh api "repos/$REPO/git/trees/HEAD?recursive=1" 2>/dev/null) || {
  jq -n --arg r "$REPO" '{"error":("Repo inaccessible: " + $r)}'
  exit 0
}

# Layouts de config candidats — seuls ceux réellement présents dans l'arbre sont retenus
EXISTING_PATHS=$(
  echo "$TREE" | jq -r \
    '[.tree[].path] as $all |
     [".claude/settings.json", ".claude/settings.local.json", ".claude/hooks.json", "hooks.json", "hooks/hooks.json"] |
     map(select(. as $p | $all | index($p))) | .[]'
)
CONFIG_FILES=()
while IFS= read -r p; do
  [[ -n "$p" ]] && CONFIG_FILES+=("$p")
done <<< "$EXISTING_PATHS"

# Extrait uniquement la clé "hooks" d'un fichier JSON distant
fetch_hooks_key() {
  local path="$1"
  [[ -z "$path" ]] && echo "null" && return
  local raw
  raw=$(gh api "repos/$REPO/contents/$path" --jq '.content' 2>/dev/null | base64 -d 2>/dev/null) || { echo "null"; return; }
  echo "$raw" | jq '.hooks // null' 2>/dev/null || echo "null"
}

# Récupère un fichier texte sous forme de chaîne JSON
fetch_text_json() {
  local path="$1"
  [[ -z "$path" ]] && echo "null" && return
  local raw
  raw=$(gh api "repos/$REPO/contents/$path" --jq '.content' 2>/dev/null | base64 -d 2>/dev/null) || { echo "null"; return; }
  [[ -z "$raw" ]] && echo "null" && return
  echo "$raw" | jq -Rs '.'
}

# Clé "hooks" principale : premier layout non-local trouvé avec des hooks.
# Clé "hooks_local" : .claude/settings.local.json.
HOOKS="null"
HOOKS_LOCAL="null"
for p in "${CONFIG_FILES[@]}"; do
  [[ -z "$p" ]] && continue
  key=$(fetch_hooks_key "$p")
  if [[ "$p" == ".claude/settings.local.json" ]]; then
    [[ "$key" != "null" ]] && HOOKS_LOCAL="$key"
  elif [[ "$HOOKS" == "null" ]]; then
    HOOKS="$key"
  fi
done

# Scripts candidats : .claude/hooks/* (toujours) + hooks/* si layout plugin détecté.
# Filtre par extension code pour ignorer README/docs/du bruit.
CODE_EXT_RE='\.(js|mjs|cjs|ts|py|sh|rb|php)$'
SCRIPT_PATHS=$(
  {
    echo "$TREE" | jq -r --arg re "$CODE_EXT_RE" \
      '[.tree[].path | select(startswith(".claude/hooks/")) | select(test($re))] | .[]'
    if printf '%s\n' "${CONFIG_FILES[@]}" | grep -qx 'hooks/hooks.json'; then
      echo "$TREE" | jq -r --arg re "$CODE_EXT_RE" \
        '[.tree[].path | select(startswith("hooks/") and . != "hooks/hooks.json") | select(test($re))] | .[]'
    fi
  } | grep -v '^$' | sort -u
)

SCRIPTS_ARR="[]"
if [[ -n "$SCRIPT_PATHS" ]]; then
  SCRIPTS_ARR=$(
    while IFS= read -r p; do
      [[ -z "$p" ]] && continue
      content=$(fetch_text_json "$p")
      [[ "$content" == "null" ]] && continue
      jq -n --arg path "$p" --argjson c "$content" '{"path":$path,"content":$c}'
    done <<< "$SCRIPT_PATHS" | jq -s '.'
  )
fi

HAS_HOOKS=$(jq -n \
  --argjson h "$HOOKS" --argjson l "$HOOKS_LOCAL" \
  '($h != null and ($h|keys|length) > 0) or ($l != null and ($l|keys|length) > 0)')

CONFIG_PATHS_JSON=$(printf '%s\n' "${CONFIG_FILES[@]}" | grep -v '^$' | jq -R -s 'split("\n") | map(select(length > 0))')

# Slugs existants pré-calculés pour la déduplication (évite de charger le registre en contexte)
EXISTING_SLUGS="[]"
[[ -f "$REGISTRY" ]] && EXISTING_SLUGS=$(jq '[.[].slug]' "$REGISTRY")

jq -n \
  --arg repo "$REPO" \
  --argjson has_hooks "$HAS_HOOKS" \
  --argjson config_paths "$CONFIG_PATHS_JSON" \
  --argjson hooks "$HOOKS" \
  --argjson hooks_local "$HOOKS_LOCAL" \
  --argjson scripts "$SCRIPTS_ARR" \
  --argjson existing_slugs "$EXISTING_SLUGS" \
  '{repo:$repo,has_hooks:$has_hooks,config_paths:$config_paths,hooks:$hooks,hooks_local:$hooks_local,hook_scripts:$scripts,existing_slugs:$existing_slugs}'
