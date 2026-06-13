# Logo Evolution — Header

## Contexte

Le logo du Header était un SVG inline codé en dur dans `Header.tsx` (5 rectangles formant un motif de stack). Un nouveau logo de marque (`hookstack.svg`) a été créé et placé dans `/public`.

## Changement

**Fichier modifié :** `src/components/Header.tsx`

Remplacement du SVG inline par un composant `<Image>` Next.js pointant vers `/public/hookstack.svg` :

```tsx
// Avant — SVG inline sans fichier externe
<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
  <rect x="8.5" y="1" width="7" height="3.5" rx="1" fill="currentColor"/>
  ...
</svg>

// Après — référence au fichier logo
<Image src="/hookstack.svg" alt="" width={24} height={24} aria-hidden="true" />
```

## Choix techniques

**`<Image>` Next.js plutôt que `<img>`** : lazy loading automatique, pas de CLS (dimensions explicites), cohérence avec les conventions du projet.

**`alt=""`** : le logo est décoratif — le lien parent porte déjà `aria-label="HookStack — home"`. Un `alt` vide évite la double annonce aux lecteurs d'écran.

**Taille 24×24** : légèrement plus grande que l'ancien SVG (20×20) pour mieux mettre en valeur le nouveau logo plus détaillé.

## Point d'attention

Le SVG contient un fond noir (`<path fill="#000000">`). Sur le header sombre (`bg-[#0a0a0a]/80`) il se fond naturellement. Si un fond transparent est souhaité à l'avenir, il suffit de retirer ce premier `<path>` dans `public/hookstack.svg`.

## Fichiers assets ajoutés

| Fichier | Rôle |
|---|---|
| `public/hookstack.svg` | Logo principal (512×512 viewBox) |
| `public/favicon.svg` | Favicon SVG |
| `public/favicon.ico` | Favicon ICO |
| `public/favicon-96x96.png` | Favicon PNG 96px |
| `public/apple-touch-icon.png` | Icône iOS |
| `public/icon-192.png` | PWA icon 192px |
| `public/icon-512.png` | PWA icon 512px |
