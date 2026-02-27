# Slicer.dev Animation - Remotion Recreation

Cette animation reproduit la vidéo promotionnelle de Slicer.dev en utilisant **Remotion**, un framework React pour créer des vidéos programmatiques.

## Structure du projet

```
slicer-animation/
├── src/
│   ├── index.ts                    # Point d'entrée Remotion
│   ├── Root.tsx                    # Configuration des compositions
│   ├── SlicerAnimation.tsx         # Composant principal orchestrant les scènes
│   └── scenes/
│       ├── LogoReveal.tsx          # Scène 1: Révélation du logo (0-5s)
│       ├── KeywordScene.tsx        # Scène 2: Mots-clés animés (5-15s)
│       ├── DemoScene.tsx           # Scène 3: Démonstration interface (15-40s)
│       ├── ProductCard.tsx         # Scène 4: Carte produit (40-49s)
│       └── TaglineScene.tsx        # Scène 5: Tagline final (49-59s)
├── package.json
├── tsconfig.json
└── README.md
```

## Installation

```bash
cd slicer-animation
pnpm install
```

## Utilisation

### Prévisualiser l'animation

```bash
pnpm start
```

Cela ouvrira l'interface Remotion Studio dans votre navigateur où vous pourrez prévisualiser et ajuster l'animation en temps réel.

### Rendre la vidéo

```bash
pnpm run build -- SlicerAnimation out/video.mp4
```

Options de rendu avancées:

```bash
# Rendu en 1080p à 60fps
remotion render SlicerAnimation out/video.mp4 --width=1920 --height=1080 --fps=60

# Rendu d'une section spécifique (frames 0-300)
remotion render SlicerAnimation out/video.mp4 --frames=0-300

# Rendu avec codec H.265 pour meilleure compression
remotion render SlicerAnimation out/video.mp4 --codec=h265
```

## Personnalisation

### Modifier les couleurs

Les couleurs principales sont définies dans chaque composant de scène:

- **Fond**: `#E8EDF2` (gris-bleu clair)
- **Rose/Magenta**: `#FF1654`
- **Noir**: `#1A1A1A`
- **Bleu**: `#0084FF`
- **Gris foncé**: `#7A7A7A`

### Ajuster le timing

Le timing des scènes est défini dans `SlicerAnimation.tsx`:

```typescript
const scenes = {
  logoReveal: { start: 0, end: 150 },      // 0-5s
  keywords: { start: 150, end: 450 },      // 5-15s
  demo: { start: 450, end: 1200 },         // 15-40s
  productCard: { start: 1200, end: 1470 }, // 40-49s
  tagline: { start: 1470, end: 1770 },     // 49-59s
};
```

Modifiez ces valeurs pour ajuster la durée de chaque scène (à 30fps).

### Modifier les animations

Chaque scène utilise les utilitaires Remotion pour les animations:

- **`interpolate()`**: Pour les transitions linéaires
- **`spring()`**: Pour les animations avec rebond naturel
- **`useCurrentFrame()`**: Pour obtenir le frame actuel

Exemple d'animation personnalisée:

```typescript
const opacity = interpolate(
  frame,
  [0, 30],      // De frame 0 à 30
  [0, 1],       // De opacité 0 à 1
  {
    extrapolateRight: 'clamp', // Maintenir à 1 après frame 30
  }
);
```

## Animations implémentées

### Scène 1: Logo Reveal
- Fade in progressif
- Scale up avec effet spring
- Durée: 5 secondes

### Scène 2: Keywords
- Rotation de 3 mots-clés ("websites", "components", "inspiration")
- Fade in/out avec translation verticale
- Durée: 10 secondes

### Scène 3: Demo
- **Partie A (0-10s)**: Carte "AI design tools" avec 3 outils
  - Slide up animation
  - Apparition séquentielle des items
  - Bouton flottant avec hover effect
- **Partie B (10-25s)**: "Vibecoding tool"
  - Bouton "Copy slice" principal
  - Icônes d'outils en séquence stagger
  - Tooltip animé

### Scène 4: Product Card
- Carte produit Slicer.dev complète
- Zoom in avec spring
- Métriques d'engagement
- Durée: 9 secondes

### Scène 5: Tagline
- Logo en haut
- Tagline "Web inspiration to implementation"
- Effet de révélation progressive sur "implementation"
- Durée: 10 secondes

## Optimisations possibles

1. **Ajouter des assets réels**: Remplacer les placeholders par les vraies icônes et logos
2. **Améliorer les transitions**: Ajouter des effets de blur ou de morphing entre scènes
3. **Audio**: Intégrer une bande sonore avec `<Audio>` de Remotion
4. **Responsive**: Adapter les tailles pour différents formats (carré, vertical)
5. **Performance**: Utiliser `<Sequence>` pour optimiser le rendu

## Ressources

- [Documentation Remotion](https://www.remotion.dev/docs)
- [Exemples Remotion](https://www.remotion.dev/showcase)
- [API Remotion](https://www.remotion.dev/docs/api)

## Notes techniques

- **FPS**: 30 images par seconde (configurable)
- **Résolution**: 1920x1080 (Full HD)
- **Durée totale**: 59 secondes (1770 frames)
- **Format**: React/TypeScript
- **Rendu**: Compatible MP4, WebM, GIF, PNG sequence
