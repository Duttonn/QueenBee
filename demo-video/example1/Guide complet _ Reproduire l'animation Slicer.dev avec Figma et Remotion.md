# Guide complet : Reproduire l'animation Slicer.dev avec Figma et Remotion

## Vue d'ensemble

Ce projet contient tout le nécessaire pour reproduire l'animation promotionnelle de **Slicer.dev** en utilisant **Figma** pour le design et **Remotion** pour l'animation programmatique.

L'animation originale dure **59 secondes** et présente le produit Slicer.dev à travers 5 scènes distinctes avec des transitions fluides et des animations sophistiquées.

## Contenu du projet

Le projet est organisé en plusieurs fichiers et dossiers:

### Structure des fichiers

```
slicer-animation/
├── src/
│   ├── index.ts                    # Point d'entrée Remotion
│   ├── Root.tsx                    # Configuration des compositions
│   ├── SlicerAnimation.tsx         # Orchestration des scènes
│   └── scenes/
│       ├── LogoReveal.tsx          # Scène 1: Logo (0-5s)
│       ├── KeywordScene.tsx        # Scène 2: Mots-clés (5-15s)
│       ├── DemoScene.tsx           # Scène 3: Démo (15-40s)
│       ├── ProductCard.tsx         # Scène 4: Carte produit (40-49s)
│       └── TaglineScene.tsx        # Scène 5: Tagline (49-59s)
├── package.json                    # Dépendances npm
├── tsconfig.json                   # Configuration TypeScript
├── README.md                       # Documentation technique
└── FIGMA_GUIDE.md                  # Guide complet Figma
```

## Analyse de la vidéo originale

### Palette de couleurs identifiée

| Couleur | Code HEX | Usage |
|---------|----------|-------|
| Fond principal | `#E8EDF2` | Arrière-plan de toutes les scènes |
| Rose/Magenta | `#FF1654` | Accent principal, logo, CTA |
| Noir | `#1A1A1A` | Texte, icônes, containers |
| Gris foncé | `#7A7A7A` | Cartes, surfaces secondaires |
| Bleu | `#0084FF` | Boutons d'action secondaires |
| Blanc | `#FFFFFF` | Cartes, surfaces claires |
| Gris texte | `#666666` | Texte secondaire |
| Gris clair | `#888888` | Tags, métadonnées |

### Timeline des scènes

L'animation est découpée en 5 scènes principales:

#### Scène 1: Logo Reveal (0-5 secondes)
- Fond gris-bleu clair
- Logo Slicer.dev apparaît au centre
- Animation: fade in + scale up avec effet spring
- Composition: icône noire avec "S" rose + texte "slicer.dev"

#### Scène 2: Keywords (5-15 secondes)
- Rotation de mots-clés en rose
- Mots affichés: "websites", "components", "inspiration"
- Animation: fade in/out avec translation verticale
- Chaque mot reste visible ~3 secondes

#### Scène 3: Demo (15-40 secondes)

**Partie A (15-25s): "Click to Copy"**
- Titre: "click to copy" (copy en rose)
- Carte grise avec "AI design tools"
- Liste de 3 outils (Slicer.dev, Figma, Framer)
- Bouton bleu flottant "click to copy"
- Animation: slide up de la carte

**Partie B (25-40s): "Vibecoding Tool"**
- Titre: "or any vibecoding tool"
- Bouton rose principal "Copy slice" avec icône Figma
- Rangée de 4 icônes d'outils
- Tooltip rose "prompt.tsx"
- Animation: apparition séquentielle des icônes

#### Scène 4: Product Card (40-49 secondes)
- Carte produit blanche centrée
- Logo + titre "Slicer.dev" avec lien externe
- Description complète
- Tags: Developer Tools, Chrome Extension
- Métriques: 💬 24, 🔺 412
- Animation: zoom in avec spring

#### Scène 5: Tagline (49-59 secondes)
- Logo Slicer.dev en haut
- Tagline: "Web inspiration to implementation,"
- Animation: révélation progressive du mot "implementation"
- Effet de fade in sur l'opacité

## Partie 1: Design dans Figma

### Installation et configuration

Le fichier **FIGMA_GUIDE.md** contient toutes les instructions détaillées pour créer les éléments de design dans Figma.

#### Étapes principales:

1. **Créer le fichier Figma**
   - Frame: 1920x1080px
   - Grille: 8px

2. **Configurer les styles de couleur**
   - Créer 8 styles de couleur (voir tableau ci-dessus)
   - Utiliser "Create style" pour chaque couleur

3. **Configurer les styles de texte**
   - Heading 1: 80px Bold (logo)
   - Heading 2: 120px Bold (titres de scène)
   - Heading 3: 48px SemiBold (sections)
   - Body Large: 20px Regular
   - Body Small: 16px Regular

4. **Créer les composants**
   - Logo Slicer.dev (icône + texte)
   - Cartes d'outils
   - Boutons (Click to Copy, Copy Slice)
   - Icônes d'outils
   - Tooltips
   - Carte produit finale

5. **Exporter les assets**
   - SVG pour les logos et icônes
   - PNG @2x pour les images
   - Copier les styles CSS pour le code

### Polices recommandées

- **Inter** (recommandé): Police sans-serif moderne, excellente lisibilité
- **SF Pro**: Police système Apple, très polyvalente
- **Geist**: Police moderne de Vercel

Téléchargez et installez la police choisie avant de commencer dans Figma.

## Partie 2: Animation avec Remotion

### Installation

```bash
# Extraire l'archive
unzip slicer-animation.zip
cd slicer-animation

# Installer les dépendances
pnpm install
# ou
npm install
```

### Lancer le projet

```bash
# Prévisualiser l'animation dans le navigateur
pnpm start

# Le Remotion Studio s'ouvrira sur http://localhost:3000
```

### Comprendre la structure du code

#### 1. Point d'entrée: `src/index.ts`

Enregistre la composition Remotion:

```typescript
import { registerRoot } from 'remotion';
import { RemotionRoot } from './Root';

registerRoot(RemotionRoot);
```

#### 2. Configuration: `src/Root.tsx`

Définit les paramètres de la vidéo:

```typescript
<Composition
  id="SlicerAnimation"
  component={SlicerAnimation}
  durationInFrames={1770}  // 59 secondes à 30fps
  fps={30}
  width={1920}
  height={1080}
/>
```

#### 3. Orchestration: `src/SlicerAnimation.tsx`

Gère le timing et l'affichage des scènes:

```typescript
const scenes = {
  logoReveal: { start: 0, end: 150 },      // 0-5s
  keywords: { start: 150, end: 450 },      // 5-15s
  demo: { start: 450, end: 1200 },         // 15-40s
  productCard: { start: 1200, end: 1470 }, // 40-49s
  tagline: { start: 1470, end: 1770 },     // 49-59s
};
```

#### 4. Scènes individuelles: `src/scenes/*.tsx`

Chaque scène est un composant React indépendant qui reçoit le numéro de frame actuel et calcule ses animations.

### Techniques d'animation utilisées

#### Interpolation linéaire

Pour les transitions simples:

```typescript
const opacity = interpolate(
  frame,
  [0, 30],      // De frame 0 à 30
  [0, 1],       // De opacité 0 à 1
  {
    extrapolateRight: 'clamp', // Maintenir à 1 après
  }
);
```

#### Animation spring

Pour les mouvements naturels avec rebond:

```typescript
const scale = spring({
  frame,
  fps,
  config: { damping: 200 },
  from: 0.8,
  to: 1,
});
```

#### Animation séquentielle

Pour faire apparaître des éléments les uns après les autres:

```typescript
{items.map((item, index) => {
  const delay = index * 10; // 10 frames de décalage
  const opacity = interpolate(
    frame,
    [delay, delay + 15],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  return <div style={{ opacity }}>{item}</div>;
})}
```

### Personnalisation

#### Modifier les couleurs

Recherchez et remplacez les valeurs HEX dans les fichiers de scène:

```typescript
// Avant
backgroundColor: '#FF1654'

// Après (exemple)
backgroundColor: '#00FF00'
```

#### Ajuster le timing

Modifiez les valeurs dans `SlicerAnimation.tsx`:

```typescript
// Exemple: prolonger la scène du logo de 5s à 8s
logoReveal: { start: 0, end: 240 }, // 8s * 30fps = 240 frames
```

#### Changer les textes

Éditez directement dans les composants de scène:

```typescript
// Dans KeywordScene.tsx
const keywords = [
  { text: 'websites', start: 0, end: 90 },
  { text: 'applications', start: 90, end: 180 }, // Modifié
  { text: 'design', start: 180, end: 270 },      // Modifié
];
```

### Rendu de la vidéo finale

#### Rendu basique

```bash
pnpm run build -- SlicerAnimation out/video.mp4
```

#### Rendu en haute qualité

```bash
# 1080p à 60fps
remotion render SlicerAnimation out/video.mp4 --width=1920 --height=1080 --fps=60

# 4K à 30fps
remotion render SlicerAnimation out/video.mp4 --width=3840 --height=2160 --fps=30

# Avec codec H.265 (meilleure compression)
remotion render SlicerAnimation out/video.mp4 --codec=h265
```

#### Rendu d'une section spécifique

```bash
# Seulement les 10 premières secondes
remotion render SlicerAnimation out/preview.mp4 --frames=0-300
```

#### Export en GIF

```bash
remotion render SlicerAnimation out/animation.gif --codec=gif
```

## Workflow complet recommandé

### Phase 1: Design (Figma)

1. Créer le fichier Figma avec les paramètres corrects
2. Configurer tous les styles de couleur et de texte
3. Créer les composants principaux (logo, cartes, boutons)
4. Créer des frames de référence pour chaque scène
5. Exporter les assets (SVG, PNG)
6. Copier les styles CSS pour référence

**Durée estimée**: 2-4 heures

### Phase 2: Intégration (Remotion)

1. Installer les dépendances du projet
2. Lancer le Remotion Studio
3. Remplacer les placeholders par vos assets Figma
4. Ajuster les couleurs et typographies selon vos styles
5. Tester les animations frame par frame
6. Ajuster le timing si nécessaire

**Durée estimée**: 3-5 heures

### Phase 3: Raffinement

1. Ajouter les vraies icônes de marques (Figma, Framer, React)
2. Améliorer les transitions entre scènes
3. Ajouter des effets supplémentaires (blur, glow)
4. Optimiser les performances
5. Tester sur différentes résolutions

**Durée estimée**: 2-3 heures

### Phase 4: Production

1. Rendre la vidéo en haute qualité
2. Vérifier la qualité du rendu
3. Exporter en différents formats si nécessaire
4. Compresser pour le web si applicable

**Durée estimée**: 1-2 heures

## Améliorations possibles

### Audio

Ajoutez une bande sonore avec le composant `<Audio>`:

```typescript
import { Audio } from 'remotion';

<Audio src="/path/to/music.mp3" />
```

### Effets avancés

- **Blur**: Ajoutez des transitions avec flou
- **Particles**: Effets de particules pour les transitions
- **3D**: Utilisez Three.js avec Remotion pour des effets 3D
- **Morphing**: Transitions morphing entre formes

### Responsive

Créez des compositions pour différents formats:

```typescript
// Format carré (Instagram)
<Composition
  id="SlicerAnimationSquare"
  component={SlicerAnimation}
  width={1080}
  height={1080}
  fps={30}
  durationInFrames={1770}
/>

// Format vertical (Stories)
<Composition
  id="SlicerAnimationVertical"
  component={SlicerAnimation}
  width={1080}
  height={1920}
  fps={30}
  durationInFrames={1770}
/>
```

### Interactivité

Utilisez les props pour rendre l'animation paramétrable:

```typescript
interface SlicerAnimationProps {
  logoText?: string;
  primaryColor?: string;
  keywords?: string[];
}

export const SlicerAnimation: React.FC<SlicerAnimationProps> = ({
  logoText = 'slicer.dev',
  primaryColor = '#FF1654',
  keywords = ['websites', 'components', 'inspiration'],
}) => {
  // Utiliser les props dans le rendu
};
```

## Ressources et documentation

### Remotion

- **Documentation officielle**: [remotion.dev/docs](https://remotion.dev/docs)
- **Showcase**: [remotion.dev/showcase](https://remotion.dev/showcase)
- **Discord**: [remotion.dev/discord](https://remotion.dev/discord)
- **GitHub**: [github.com/remotion-dev/remotion](https://github.com/remotion-dev/remotion)

### Figma

- **Documentation**: [help.figma.com](https://help.figma.com)
- **Community**: [figma.com/community](https://figma.com/community)
- **Plugins**: [figma.com/community/plugins](https://figma.com/community/plugins)

### React

- **Documentation**: [react.dev](https://react.dev)
- **TypeScript**: [typescriptlang.org](https://typescriptlang.org)

### Inspiration

- **Dribbble**: Designs d'animations
- **Awwwards**: Sites web primés
- **CodePen**: Exemples d'animations CSS/JS

## Dépannage

### Problème: "Cannot find module"

```bash
# Réinstaller les dépendances
rm -rf node_modules package-lock.json
pnpm install
```

### Problème: Animations saccadées dans le preview

- C'est normal, le rendu final sera fluide
- Réduisez la qualité du preview dans les paramètres

### Problème: Rendu très lent

```bash
# Utiliser le rendu parallèle
remotion render SlicerAnimation out/video.mp4 --concurrency=4
```

### Problème: Fichier vidéo trop lourd

```bash
# Utiliser H.265 pour meilleure compression
remotion render SlicerAnimation out/video.mp4 --codec=h265

# Ou réduire la qualité
remotion render SlicerAnimation out/video.mp4 --quality=80
```

## Support et contribution

Pour toute question ou suggestion:

1. Consultez d'abord la documentation Remotion
2. Recherchez dans les issues GitHub de Remotion
3. Posez votre question sur le Discord Remotion
4. Ouvrez une issue sur le repository du projet

## Licence

Ce projet est fourni à titre d'exemple éducatif. Les marques et logos mentionnés (Slicer.dev, Figma, Framer, React) appartiennent à leurs propriétaires respectifs.

---

**Bon courage pour votre projet d'animation !** 🎬✨
