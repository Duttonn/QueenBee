# 🐝 QUEEN BEE - GLOBAL STATUS & DISPATCH (GSD)
# Généré par : Architecte Agent
# Date : 2026-02-07
# Source : PRD v3.1 + Audit UX Web + Antigravity Merge Report

## 📊 Status Global
- **Phase 0 (Soudure)**: ✅ COMPLETE
- **Blocker #1**: Agent "lobotomisé" en mode Cloud/Worktree (S-11)
- **Blocker #2**: Régressions UI majeures (Model Picker, Sidebar, Automation)
- **Claim API**: http://127.0.0.1:3000/api/tasks/claim

## 🧠 Protocol Reminder (Pour les Agents)
> **Règle d'Or** : Ne touchez PAS à ce fichier manuellement. Utilisez l'API claim.
> **Isolation** : Travaillez toujours dans `../worktrees/task-{id}`.

## 🔧 PHASE 0.5: POLISH & AGENTIC UNLOCK (Urgences Web)
> **Règle** : Priorité absolue avant de continuer la Phase 1.

- [ ] `S-11`: [Backend] Débloquer la boucle agentique pour TOUS les modes
  - **Fichiers**: `proxy-bridge/src/pages/api/chat.ts`
  - **Action**: Remplacer `if (stream && (mode === 'autonomous' || mode === 'local' || mode === 'solo'))` par `if (stream && mode !== 'raw')` pour inclure `cloud` et `worktree`.
  - **Validation**: Un agent en mode "cloud" doit pouvoir utiliser `write_file`.
  - **Worker**: BACKEND

- [ ] `S-12`: [Frontend] Fix Model Picker (Z-Index & CSS Overflow)
  - **Fichiers**: `dashboard/src/components/layout/CodexLayout.tsx` (ou composant dédié)
  - **Action**: Sortir le menu du flux overflow ou utiliser un Portal. S'assurer qu'il s'affiche AU-DESSUS de la fenêtre de chat.
  - **Worker**: FRONTEND

- [ ] `S-13`: [Frontend] Model Picker: Tri par provider et modèle par défaut intelligent
  - **Fichiers**: `dashboard/src/components/layout/CodexLayout.tsx`, `dashboard/src/store/useAuthStore.ts`
  - **Action**: Prendre le premier modèle de la liste `availableModels` au boot. Trier la liste par Provider (Gemini ensemble, Nvidia ensemble).
  - **Worker**: FRONTEND

- [ ] `S-14`: [Frontend] Sidebar: Remplacer "New Thread" par Project Picker Dropdown
  - **Fichiers**: `dashboard/src/components/layout/Sidebar.tsx`
  - **Action**: Supprimer le bouton "+" inutile. Transformer l'affichage du projet courant en dropdown pour changer de projet/créer un thread dans un projet spécifique.
  - **Worker**: FRONTEND

- [ ] `S-15`: [Frontend] Fix Automation Dashboard (CRUD & Folder Picker)
  - **Fichiers**: `dashboard/src/components/layout/AutomationDashboard.tsx`
  - **Action**: Connecter les boutons On/Off, Delete. Réparer le folder picker lors de la création d'une automation (doit ouvrir un dialog ou lister les projets).
  - **Worker**: FRONTEND

- [ ] `S-16`: [Frontend] Unifier Search et Cmd+K
  - **Fichiers**: `dashboard/src/components/layout/Sidebar.tsx`
  - **Action**: Connecter le clic sur le bouton "Search" au même trigger que `Cmd+K`.
  - **Worker**: FRONTEND

- [ ] `S-17`: [Frontend] Restaurer le panneau Settings et le Micro
  - **Fichiers**: `dashboard/src/components/layout/CodexLayout.tsx`, `dashboard/src/components/VoiceInput.tsx`
  - **Action**: Ré-afficher le label "Settings" à côté de l'icône. Ajouter un bouton "Stop/Send" dans l'UI du micro pour valider la capture vocale.
  - **Worker**: FRONTEND

- [DONE] `S-18`: [Integration] Parser les events Tools dans le stream SSE
  - **Fichiers**: `dashboard/src/services/api.ts`
  - **Action**: Mettre à jour `sendChatMessageStream` pour qu'il ne parse pas que `content` mais aussi les events `tool_start`, `tool_end` et les affiche dans la console/UI.
  - **Worker**: INTEGRATION

## 🚀 PHASE 1: SOLO MODE COMPLET (En attente de Phase 0.5)
- [ ] `P1-01`: [Frontend] Nettoyer le "Live Preview" (enlever le placeholder "gerz")
- [ ] `P1-02`: [Backend] Implémenter le résumé automatique de fin de session
...etc