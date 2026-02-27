# Guide Figma pour l'animation Slicer.dev

Ce guide vous accompagne dans la création des éléments de design dans Figma avant de les intégrer dans Remotion.

## Configuration du projet Figma

### 1. Créer un nouveau fichier

Créez un nouveau fichier Figma avec les paramètres suivants:

- **Nom**: "Slicer.dev Animation Assets"
- **Frame principal**: 1920x1080px (Full HD)
- **Grille**: 8px pour l'alignement

### 2. Palette de couleurs

Créez des styles de couleur pour maintenir la cohérence:

| Nom du style | Valeur HEX | Usage |
|--------------|------------|-------|
| Background | `#E8EDF2` | Fond principal |
| Primary Pink | `#FF1654` | Accent principal, CTA |
| Dark | `#1A1A1A` | Texte, icônes |
| Gray Dark | `#7A7A7A` | Cartes, containers |
| Blue | `#0084FF` | Boutons secondaires |
| White | `#FFFFFF` | Cartes, surfaces |
| Text Gray | `#666666` | Texte secondaire |
| Text Light Gray | `#888888` | Tags, métadonnées |

**Comment créer les styles:**
1. Sélectionnez un rectangle
2. Appliquez la couleur
3. Clic droit sur la couleur > "Create style"
4. Nommez le style

### 3. Typographie

Configurez les styles de texte suivants:

#### Heading 1 - Logo Text
- **Police**: Inter ou SF Pro Display
- **Poids**: Bold (700)
- **Taille**: 80px
- **Hauteur de ligne**: 100%
- **Couleur**: Dark (#1A1A1A) ou Primary Pink (#FF1654)

#### Heading 2 - Scene Title
- **Police**: Inter ou SF Pro Display
- **Poids**: Bold (700)
- **Taille**: 120px
- **Hauteur de ligne**: 100%
- **Couleur**: Primary Pink (#FF1654)

#### Heading 3 - Section Title
- **Police**: Inter ou SF Pro Display
- **Poids**: SemiBold (600)
- **Taille**: 48px
- **Hauteur de ligne**: 120%
- **Couleur**: Dark (#1A1A1A)

#### Body Large
- **Police**: Inter ou SF Pro Text
- **Poids**: Regular (400)
- **Taille**: 20px
- **Hauteur de ligne**: 150%
- **Couleur**: Text Gray (#666666)

#### Body Small
- **Police**: Inter ou SF Pro Text
- **Poids**: Regular (400)
- **Taille**: 16px
- **Hauteur de ligne**: 140%
- **Couleur**: Text Light Gray (#888888)

**Comment créer les styles:**
1. Créez un texte avec les propriétés souhaitées
2. Clic droit > "Create text style"
3. Nommez le style

## Composants à créer

### Composant 1: Logo Slicer.dev

#### Icône du logo

**Étapes:**

1. Créez un rectangle de 100x100px
2. Appliquez un rayon de bordure de 24px
3. Couleur de fond: Dark (#1A1A1A)
4. Créez un texte "S" au centre:
   - Police: Bold, 48px
   - Couleur: Primary Pink (#FF1654)
   - Centrez-le dans le rectangle
5. Dessinez une ligne diagonale avec l'outil Pen (P):
   - Point de départ: (20, 80)
   - Point d'arrivée: (80, 20)
   - Stroke: 4px, Primary Pink (#FF1654)
   - Caps: Round

**Créer le composant:**
- Sélectionnez tous les éléments
- Cmd/Ctrl + Alt + K pour créer un composant
- Nommez: "Logo Icon"

#### Logo complet

1. Dupliquez le composant "Logo Icon"
2. Ajoutez le texte "slicer.dev" à droite:
   - "slicer" en Dark (#1A1A1A)
   - ".dev" en Primary Pink (#FF1654)
   - Police: Bold, 80px
   - Espacement: 20px entre l'icône et le texte
3. Groupez le tout en Auto Layout (Shift + A):
   - Direction: Horizontal
   - Espacement: 20px
   - Alignement: Center
4. Créez un composant: "Logo Full"

### Composant 2: Carte d'outil (Tool Card)

**Structure:**

1. Créez un rectangle de 900x120px
2. Rayon de bordure: 12px
3. Couleur: White (#FFFFFF)
4. Ombre portée: X=0, Y=2, Blur=8, Color=#00000010

**Contenu (Auto Layout):**

1. **Icône** (60x60px):
   - Rectangle avec rayon 12px
   - Couleur: Dark (#1A1A1A)
   - Placeholder pour logo

2. **Zone de texte** (flex: 1):
   - **Titre**: Body Large Bold, Dark
   - **Description**: Body Large, Text Gray
   - **Tags**: Body Small, Text Light Gray avec icône 🔗

3. **Métriques** (si applicable):
   - Icônes 💬 et 🔺 avec chiffres
   - Body Small Bold

**Auto Layout:**
- Direction: Horizontal
- Espacement: 20px
- Padding: 20px
- Alignement vertical: Center

**Créer des variants:**
- Variant 1: Normal
- Variant 2: Selected (avec bordure bleue 3px)

### Composant 3: Carte de contenu principale

**Structure:**

1. Rectangle de 900x600px
2. Rayon de bordure: 24px
3. Couleur: Gray Dark (#7A7A7A)
4. Ombre: X=0, Y=20, Blur=60, Color=#00000033

**Contenu:**

1. **Titre de section**: "AI design tools"
   - Heading 3
   - Margin bottom: 30px

2. **Liste de cartes d'outils**:
   - Utilisez les instances du composant "Tool Card"
   - Espacement vertical: 15px

**Auto Layout:**
- Direction: Vertical
- Espacement: 30px
- Padding: 40px

### Composant 4: Bouton "Click to Copy"

**Structure:**

1. Rectangle avec Auto Layout
2. Rayon de bordure: 50px
3. Couleur: Blue (#0084FF)
4. Ombre: X=0, Y=10, Blur=40, Color=#0084FF66

**Contenu:**

- Texte: "click to copy"
- Police: SemiBold, 28px
- Couleur: White
- Padding: 20px horizontal, 50px vertical

**Variants:**
- Default: Scale 1.0
- Hover: Scale 1.05 (pour référence d'animation)

### Composant 5: Bouton "Copy Slice"

**Structure:**

1. Rectangle avec Auto Layout
2. Rayon de bordure: 16px
3. Couleur: Primary Pink (#FF1654)
4. Ombre: X=0, Y=10, Blur=40, Color=#FF165466

**Contenu (Auto Layout horizontal):**

1. Icône 📋 (32px)
2. Texte "Copy slice" (Bold, 32px, White)
3. Icône Figma (50x50px, placeholder noir)
4. Icône ▼ (24px)

**Espacement:** 20px entre éléments

### Composant 6: Icônes d'outils

Créez des placeholders carrés pour:

- Figma (80x80px, multicolore)
- Framer (80x80px, noir)
- React (80x80px, bleu)
- Autre outil (80x80px, bleu)

**Propriétés:**
- Rayon de bordure: 16px
- Groupez-les en composant "Tool Icons Row"
- Auto Layout horizontal, espacement 20px

### Composant 7: Tooltip

**Structure:**

1. Rectangle avec Auto Layout
2. Rayon de bordure: 12px
3. Couleur: Primary Pink (#FF1654)
4. Ombre: X=0, Y=5, Blur=20, Color=#FF16544D

**Contenu:**

- Icône 📄 + texte "prompt.tsx"
- Police: SemiBold, 20px, White
- Padding: 15px horizontal, 25px vertical

### Composant 8: Carte produit finale

**Structure:**

1. Rectangle de 1000x200px
2. Rayon de bordure: 24px
3. Couleur: White (#FFFFFF)
4. Ombre: X=0, Y=20, Blur=80, Color=#00000026

**Contenu (Auto Layout horizontal):**

1. **Logo** (100x100px):
   - Rayon 20px
   - Dark background

2. **Zone de contenu** (flex: 1):
   - **Titre**: "Slicer.dev" + icône ↗
   - **Description**: Body Large
   - **Tags**: Body Small avec icônes

3. **Métriques** (colonnes):
   - 💬 24
   - 🔺 412
   - Police: Bold, 24px

## Export des assets

### Pour Remotion

**Option 1: Export SVG (recommandé)**

1. Sélectionnez le composant
2. Clic droit > "Copy as SVG"
3. Collez dans votre code React/Remotion

**Option 2: Export PNG**

1. Sélectionnez le composant
2. Dans le panneau de droite, section "Export"
3. Format: PNG
4. Échelle: 2x ou 3x pour la qualité
5. Cliquez "Export"

**Éléments à exporter:**

- Logo Icon (SVG)
- Logo Full (SVG)
- Icônes d'outils individuelles (PNG @2x)
- Composants de cartes (pour référence visuelle)

### Pour les animations

**Créer des frames de référence:**

1. Créez une page "Animation Frames"
2. Dupliquez votre frame 1920x1080px pour chaque scène clé
3. Positionnez les éléments selon le timing:
   - Frame 1: Logo centered
   - Frame 2: Keyword "websites"
   - Frame 3: Demo card
   - Frame 4: Vibecoding tools
   - Frame 5: Product card
   - Frame 6: Tagline

Cela vous servira de référence visuelle lors de l'implémentation dans Remotion.

## Workflow Figma → Remotion

### Méthode 1: Copier les styles CSS

1. Sélectionnez un élément dans Figma
2. Clic droit > "Copy/Paste as" > "Copy CSS"
3. Adaptez le CSS en style React (camelCase)

**Exemple:**

```css
/* Figma CSS */
background: #FF1654;
border-radius: 24px;
box-shadow: 0px 20px 60px rgba(0, 0, 0, 0.2);
```

```typescript
// React/Remotion style
style={{
  backgroundColor: '#FF1654',
  borderRadius: '24px',
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
}}
```

### Méthode 2: Utiliser Figma API

Pour les projets plus complexes, vous pouvez utiliser l'API Figma pour extraire automatiquement les propriétés:

```typescript
// Exemple d'extraction via API
const figmaFileKey = 'YOUR_FILE_KEY';
const nodeId = 'NODE_ID';

fetch(`https://api.figma.com/v1/files/${figmaFileKey}/nodes?ids=${nodeId}`, {
  headers: { 'X-Figma-Token': 'YOUR_TOKEN' }
})
.then(res => res.json())
.then(data => {
  // Extraire les propriétés de style
  const fills = data.nodes[nodeId].document.fills;
  const effects = data.nodes[nodeId].document.effects;
  // ...
});
```

### Méthode 3: Plugin Figma to Code

Utilisez des plugins comme:
- **Figma to React** (convertit en composants React)
- **Anima** (export vers code)
- **html.to.design** (bidirectionnel)

## Conseils de design

### Cohérence visuelle

1. **Utilisez les styles**: Ne définissez jamais de couleurs ou typos en dur
2. **Auto Layout partout**: Facilite les ajustements et l'export
3. **Composants réutilisables**: Créez des variants pour les états
4. **Nommage clair**: Utilisez des noms descriptifs (ex: "Button/Primary/Default")

### Optimisation pour l'animation

1. **Séparez les calques**: Chaque élément animé doit être un calque distinct
2. **Groupes logiques**: Utilisez des frames pour grouper les éléments qui s'animent ensemble
3. **Points d'ancrage**: Positionnez les éléments en pensant aux transformations (scale, rotate)
4. **États multiples**: Créez des variants pour l'état initial et final des animations

### Performance

1. **Vectoriel prioritaire**: Utilisez des vecteurs plutôt que des images raster quand possible
2. **Simplifiez les formes**: Réduisez le nombre de points dans les paths
3. **Optimisez les ombres**: Limitez le nombre d'effets d'ombre portée
4. **Flatten si nécessaire**: Pour les éléments complexes statiques, flatten en une image

## Ressources complémentaires

### Plugins Figma utiles

- **Iconify**: Bibliothèque d'icônes
- **Unsplash**: Images libres de droits
- **Content Reel**: Génération de contenu placeholder
- **Stark**: Vérification d'accessibilité des couleurs

### Polices recommandées

- **Inter**: Police sans-serif moderne, excellente lisibilité
- **SF Pro**: Police système Apple, très polyvalente
- **Geist**: Police moderne de Vercel, optimisée pour le code

### Inspiration

- [Dribbble](https://dribbble.com) - Designs d'animations
- [Awwwards](https://awwwards.com) - Sites web primés
- [Remotion Showcase](https://remotion.dev/showcase) - Exemples Remotion

## Checklist finale

Avant d'exporter vers Remotion:

- [ ] Tous les styles de couleur sont créés
- [ ] Tous les styles de texte sont définis
- [ ] Les composants principaux sont créés avec variants
- [ ] Les assets sont exportés en SVG/PNG haute qualité
- [ ] Les frames de référence d'animation sont créés
- [ ] Les mesures et espacements sont notés
- [ ] Les effets (ombres, flous) sont documentés
- [ ] Le fichier Figma est organisé et nommé clairement

## Support

Pour toute question sur l'intégration Figma → Remotion:

- [Documentation Remotion](https://remotion.dev/docs)
- [Community Remotion Discord](https://remotion.dev/discord)
- [Figma Community](https://figma.com/community)
