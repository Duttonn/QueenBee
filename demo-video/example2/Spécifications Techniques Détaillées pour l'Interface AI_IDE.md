# Spécifications Techniques Détaillées pour l'Interface AI/IDE

Ce document fournit une spécification technique exhaustive pour la reproduction de l'interface AI/IDE observée dans la vidéo, en se concentrant sur les éléments de design pour Figma et les animations pour Remotion. L'objectif est de capturer les micro-interactions, les timings et les courbes d'accélération pour une reproduction fidèle.

## 1. Design de l'Interface (Figma)

### 1.1. Structure Générale
L'interface est encapsulée dans une fenêtre de style macOS, caractérisée par :
- **Coins Arrondis** : Rayon de 10px pour la fenêtre principale.
- **Ombre Portée** : Légère, `box-shadow: 0px 8px 20px rgba(0, 0, 0, 0.1);`.
- **Barre de Titre** : Standard macOS avec les boutons rouge, jaune, vert.

### 1.2. Barre Latérale (Sidebar)
- **Largeur** : 280px.
- **Couleur de Fond** : `#F8F8F8`.
- **Séparateur** : `1px solid #E0E0E0`.
- **Éléments de Navigation** :
    - **Typographie** : Inter, 14px, `#333333` (actif), `#666666` (inactif).
    - **Icônes** : Filaire, 16x16px.
    - **État Actif** : Fond `#E0E0E0`, `border-radius: 4px`.
    - **Pastille de Notification** : Petit cercle bleu (`#007AFF`) pour indiquer de nouvelles activités.

### 1.3. Zone Principale
- **Couleur de Fond** : `#FFFFFF`.
- **En-tête** :
    - **Fil d'Ariane** : Typographie Inter, 14px, `#666666`.
    - **Boutons d'Action** : Style minimaliste, `padding: 5px 10px`, `border-radius: 4px`, `border: 1px solid #E0E0E0`, `background-color: #FFFFFF`.
- **Contenu Dynamique** :
    - **Écran d'Accueil** : Texte central "Let's build photobooth" (Inter, 32px, gras, `#333333`). Suggestions d'actions sous forme de cartes (fond `#F8F8F8`, `border-radius: 8px`, `box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.05)`).
    - **Vue de Code/Diff** : Typographie SF Mono/Fira Code, 14px, `line-height: 1.5`. Lignes ajoutées : `background-color: #EEFFEE`, `color: #008000`. Lignes supprimées : `background-color: #FFEEEE`, `color: #CC0000`.

### 1.4. Barre de Saisie (Input Bar)
- **Position** : Fixe en bas, `bottom: 20px`, `left: 50%`, `transform: translateX(-50%)`.
- **Dimensions** : Largeur 80%, hauteur 60px.
- **Couleur de Fond** : `#FFFFFF`.
- **Bordure** : `1px solid #E0E0E0`.
- **Coins Arrondis** : 12px.
- **Ombre Portée** : `box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.1)`.
- **Champ de Texte** : Placeholder `#999999`.
- **Sélecteur de Modèle** : Menu déroulant avec `border-radius: 4px`.
- **Icônes d'Action** : Micro, Flèche (send), Verrou. Taille 18px, couleur `#666666`.

## 2. Animations (Remotion)

### 2.1. Transitions Générales
- **Arrière-plan Flou** : Le fond d'écran flou reste statique. Les éléments de l'interface apparaissent par-dessus.
- **Apparition de la Fenêtre Principale** : 
    - **Durée** : 30 frames (à 30fps).
    - **Propriétés** : `translateY` de 20px à 0px, `opacity` de 0 à 1.
    - **Easing** : `cubic-bezier(0.4, 0, 0.2, 1)`.

### 2.2. Animation du Curseur et de la Frappe
- **Curseur Clignotant** : Un rectangle vertical (`2px` de large) qui alterne l'opacité de 0 à 1 toutes les 15 frames.
- **Effet de Frappe** : Le texte apparaît caractère par caractère. Chaque caractère a un délai séquentiel (ex: 1 frame par caractère).

### 2.3. Menu Déroulant (Workspace)
- **Apparition** : 
    - **Durée** : 10 frames.
    - **Propriétés** : `scale` de 0.95 à 1, `opacity` de 0 à 1.
    - **Easing** : `cubic-bezier(0.4, 0, 0.2, 1)`.
- **Survol des Éléments** : Changement de couleur de fond rapide (`background-color` de `#FFFFFF` à `#F0F0F0`) sur 5 frames.

### 2.4. Animation de Streaming de Texte (LLM)
- **Affichage Caractère par Caractère** : Utiliser un `Sequence` ou `spring` pour révéler le texte progressivement, avec un léger délai entre chaque mot ou phrase pour simuler une réponse d'IA.

### 2.5. Diffs de Code
- **Mise en Évidence** : Les lignes de code modifiées apparaissent avec leur couleur de fond (vert/rouge) instantanément ou avec un très léger `fade-in` sur 5 frames.

### 2.6. Fenêtres Flottantes (Popups)
- **Apparition** : 
    - **Type** : Animation de type **Spring**.
    - **Propriétés** : `translateY` (ex: de 20px à 0px) et `opacity` (de 0 à 1).
    - **Paramètres Spring** : `stiffness: 100`, `damping: 10`, `mass: 1`.
    - **Délai** : Apparaissent après une action spécifique (ex: après la génération de code).

## 3. Réutilisabilité et Modularité

Le code Remotion sera structuré en composants réutilisables pour faciliter l'intégration dans d'autres projets :
- **Composants de Base** : `Sidebar`, `Header`, `InputBar`, `CodeEditor`, `FloatingWindow`.
- **Hooks Personnalisés** : Pour gérer des animations complexes comme la frappe de texte ou le streaming de contenu.
- **Thème Centralisé** : Les couleurs, typographies et rayons de bordure seront définis dans un objet de thème pour une personnalisation facile.

Ce document servira de référence pour le développement du code Remotion, garantissant une reproduction fidèle et une architecture modulaire.
