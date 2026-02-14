Quels sont les failure modes documentés pour les systèmes
multi-agents basés sur LLM? Donne une taxonomy (timeout,
hallucination, deadlock, race condition, etc.)

Basé sur les sources fournies, les modes de défaillance ("failure modes") des systèmes multi-agents (SMA) basés sur LLM peuvent être classés en une taxonomie structurée en quatre dimensions principales : Cognitive/Comportementale, Communication/Coordination, Infrastructurelle/Opérationnelle, et Sécurité/Adversariale.
Voici la taxonomie détaillée :
1. Modes de Défaillance Cognitifs et Comportementaux
Ces échecs proviennent des limites intrinsèques des modèles de langage ou de leur interaction psychologique simulée.
• Hallucinations (Factualité vs Fidélité) :
    ◦ Inexactitude Factuelle : L'agent invente des faits pour combler des lacunes de connaissances.
    ◦ Violation de Fidélité (Faithfulness) : L'agent ignore le contexte fourni ou les instructions système (ex: contraintes négatives).
    ◦ Hallucination de Paquetages (Supply Chain) : Les agents codent en inventant des bibliothèques logicielles inexistantes, créant des failles de sécurité exploitables ("Squatting").
• Biais de Conformité et Sycophanterie (Conformity Bias) :
    ◦ Les agents ont tendance à valider les erreurs de leurs pairs ou à s'aligner sur une opinion majoritaire fausse pour être "polis" ou consensuels, menant à un "faux consensus" dangereux.
    ◦ Cela inclut l'accord silencieux où un agent abandonne une réponse correcte face à la pression du groupe.
• Effondrement par Monoculture (Monoculture Collapse) :
    ◦ Lorsque plusieurs agents reposent sur le même modèle de fondation, ils partagent les mêmes angles morts et biais. Ils échouent simultanément face aux mêmes entrées, rendant la redondance inutile.
• Défaillances de Fiabilité en Cascade (Cascading Reliability Failures) :
    ◦ Une erreur mineure ou une "pointe" d'incompétence chez un agent (ex: mal lire un graphique) est acceptée sans critique par l'agent suivant, amplifiant l'erreur à travers la chaîne de dépendance jusqu'à un échec catastrophique du système.
2. Modes de Défaillance de Communication et Coordination
Ces échecs surviennent dans l'échange d'informations entre agents.
• Déficit de Théorie de l'Esprit (Deficient Theory of Mind) :
    ◦ Les agents échouent à modéliser ce que les autres agents savent ou ignorent. Cela mène à des omissions d'information critique ou à des duplications d'efforts, car l'agent A suppose à tort que l'agent B possède le contexte nécessaire.
• Ambiguïté Sémantique et Interprétation :
    ◦ Un agent interprète mal le message d'un autre (ex: "le système est stable" interprété comme "réparé" au lieu de "ne va pas exploser tout de suite"), déclenchant des actions inappropriées.
• Boucles Conversationnelles et Impasses (Deadlock/Loops) :
    ◦ Boucles Inefficaces : Les agents entrent dans des cycles de conversation répétitifs ou d'actions sous-optimales (ex: utiliser "page_down" indéfiniment) sans progresser vers l'objectif.
    ◦ Instabilité du Consensus : Dans les systèmes stochastiques, un accord atteint au tour T peut se dissoudre au tour T+1 car les agents continuent de raffiner leur réponse, empêchant la finalisation (livelock).
3. Modes de Défaillance Infrastructurels et Opérationnels
Ces échecs concernent la gestion des ressources par le "système d'exploitation" des agents (AIOS).
• Monopolisation des Ressources (Resource Starvation) :
    ◦ Sans ordonnancement approprié, un agent peut monopoliser le GPU ou les appels LLM, affamant les autres agents et provoquant des timeouts.
• Blocage en Tête de File (Head-of-Line Blocking) :
    ◦ Les requêtes de décodage longues d'un agent bloquent les requêtes courtes des autres, augmentant la latence globale du système.
• Effet du Traînard (Straggler Effect) :
    ◦ Dans les workflows synchronisés (barrière), le système entier doit attendre l'agent le plus lent (ex: un modèle lent ou surchargé), multipliant la latence par 10-60x.
• Débordement et Perte de Contexte :
    ◦ Dans les architectures centralisées, le transfert de tout le contexte de chaque agent vers un orchestrateur central sature la fenêtre de contexte, menant à l'oubli de contraintes ("catastrophic forgetting") et à des hallucinations induites par la perte d'information.
4. Modes de Défaillance de Sécurité et Adversariaux
Ces échecs sont liés à des attaques ou des comportements malveillants.
• Comportement Byzantin :
    ◦ Des agents compromis ou défectueux envoient des données arbitraires, contradictoires ou malveillantes pour saboter le consensus ou la tâche.
• Attaque "Agent Smith" (Infectious Jailbreak) :
    ◦ Un agent compromis propage un prompt malveillant (jailbreak) à d'autres agents via la conversation, infectant exponentiellement tout le réseau.
• Dynamiques de Motifs Mixtes (Mixed Motive Dynamics) :
    ◦ Même sous gouvernance unifiée, des agents optimisant des objectifs locaux conflictuels (ex: maximiser le stock vs minimiser les coûts) peuvent aboutir à un résultat collectivement sous-optimal ou à une paralysie décisionnelle (Pareto-inefficace).
Résumé Visuel de la Taxonomie
Catégorie
Modes de Défaillance Clés
Impact Principal
Cognitif
Hallucination, Biais de Conformité, Monoculture
Décisions fausses, pensée de groupe.
Coordination
Déficit Théorie de l'Esprit, Boucles, Ambiguïté
Désalignement, tâches inachevées.
Infrastructure
Head-of-Line Blocking, Monopole, Stragglers
Latence élevée, timeouts, coûts.
Sécurité
Byzantin, Agent Smith, Supply Chain
Corruption systémique, fuite de données.
Comment la "Théorie de l'Esprit" défaillante impacte-t-elle la coordination ?
Quels sont les risques de l'hallucination de paquets en programmation ?
Comment éviter l'effondrement par monoculture dans les systèmes multi-agents ?
Explique PLAS (Program-Level Attained Service) scheduler
et comment l'appliquer à un hive d'agents LLM qui partagent
des tokens et du contexte.

Basé sur les documents fournis, et principalement sur le papier de recherche concernant Autellix, voici une explication détaillée du planificateur PLAS et de son application à un système multi-agents ("hive") partageant du contexte.
1. Qu'est-ce que PLAS (Program-Level Attained Service) ?
PLAS est un algorithme de planification conçu spécifiquement pour les systèmes de "serving" d'agents LLM. Contrairement aux planificateurs classiques (comme FCFS - First Come First Served) qui traitent chaque requête LLM isolément, PLAS traite le programme agentique (la séquence complète d'interactions de l'agent) comme un "citoyen de première classe".
• Le Problème : Dans une file d'attente classique, un agent exécutant une tâche très longue (ex: écrire un livre) peut bloquer l'accès au GPU pour des agents exécutant des tâches courtes (ex: une simple réponse "oui/non"). C'est le blocage de tête de ligne (Head-of-Line blocking).
• Le Principe : PLAS s'inspire de l'algorithme "Least-Attained-Service" (LAS) des systèmes d'exploitation. Il priorise les requêtes LLM en fonction du temps de service cumulé que leur programme parent a déjà reçu.
• La Mécanique :
    ◦ Si un appel LLM c 
j
​
  appartient à un programme P, sa priorité est déterminée par la somme des temps d'exécution de tous les appels précédents de P : p(c 
j
​
 )=∑ 
k<j
​
 t 
k
​
 .
    ◦ Plus un programme a consommé de ressources par le passé, plus sa priorité diminue. Cela permet aux programmes courts ou nouveaux de "doubler" les programmes longs dans la file d'attente, réduisant ainsi la latence globale sans nécessiter de connaître à l'avance la durée des tâches (non-clairvoyant).
2. Appliquer PLAS à un Hive d'Agents avec Contexte Partagé
Dans un "hive" (essaim) où plusieurs agents collaborent et partagent un contexte (tokens en cache), l'application de PLAS doit être adaptée pour tenir compte des dépendances et de l'efficacité du cache.
A. Architecture de Suivi (Process Table)
Pour appliquer PLAS, le système doit maintenir une Table de Processus Globale (Global Process Table) qui suit l'état de chaque flux de travail du hive.
• Identification : Chaque "mission" du hive est identifiée comme un programme unique (Session ID).
• Comptabilité : Le système enregistre le temps de calcul cumulé de tous les agents travaillant sur cette mission spécifique.
• Application : Lorsqu'un Agent B envoie une requête suite à l'Agent A, PLAS regarde le temps total consommé par A et B pour déterminer la priorité de cette nouvelle requête.
B. Impact du Partage de Contexte (KV-Cache Sharing) sur la Priorité
C'est ici que la synergie est la plus forte. Dans un hive partageant du contexte (via des mécanismes comme KVCOMM ou le Context Manager d'AIOS), le coût de calcul diminue drastiquement.
• Récompense de l'efficacité : Si l'Agent B réutilise le KV-cache de l'Agent A, l'étape de "prefill" (lecture du contexte) est quasi-instantanée ou très réduite. Par conséquent, le temps d'exécution t 
k
​
  ajouté au compteur de PLAS est faible.
• Effet Vertueux : Puisque PLAS penalise les gros consommateurs de temps, un hive qui optimise bien son partage de contexte verra son compteur de "service atteint" augmenter lentement. Il gardera donc une priorité élevée plus longtemps par rapport à des agents qui recalculent tout à chaque fois.
C. Gestion des Dépendances Multi-Agents (ATLAS)
Un hive fonctionne souvent comme un graphe (DAG) et non comme une ligne droite (ex: plusieurs agents réfléchissent en parallèle, puis un agent synthétise). Pour cela, Autellix propose une généralisation de PLAS appelée ATLAS (Adaptive Thread-Level Attained Service).
• Chemin Critique : Au lieu de simplement sommer tous les temps, ATLAS priorise les agents en fonction du temps consommé sur le chemin critique du hive (la séquence la plus longue de dépendances).
• Synchronisation : Cela évite qu'un agent "rapide" du hive ne soit trop priorisé s'il attend de toute façon un agent "lent". Le planificateur groupe naturellement les appels parallèles du même hive.
D. Load Balancing Orienté "Localité"
Pour que le partage de contexte fonctionne avec PLAS, il faut s'assurer que les agents du même hive tournent sur le même GPU (ou que le cache soit transféré).
• Stratégie Hybride : Le système doit utiliser un répartiteur de charge (Load Balancer) conscient de la localité. Comme décrit dans Autellix, les requêtes courtes peuvent être envoyées n'importe où, mais les requêtes longues (qui bénéficient le plus du contexte partagé) doivent être "épinglées" (pinned) sur le moteur qui possède déjà l'historique du hive.
Résumé de l'implémentation
Pour implémenter cela dans votre système :
1. Centralisez l'ordonnancement : Utilisez un noyau type AIOS Kernel pour intercepter tous les appels des agents.
2. Mesurez le "Service Attaint" : Implémentez un compteur total_compute_time par Mission (et non par Agent).
3. Ajustez la priorité : Priorité = 1 / total_compute_time.
4. Optimisez le Cache : Assurez-vous que le total_compute_time ne compte que le temps réel GPU. Si le contexte est partagé, ce temps diminue, augmentant mécaniquement la priorité du hive dans la file d'attente PLAS.
Comment PLAS réduit-il les temps de réponse globaux ?
Quel est l'impact du KV-Cache sur les priorités d'exécution ?
Comment ATLAS gère-t-il les agents travaillant en parallèle ?
Quel est le state-of-the-art pour les checkpoints et
rollbacks dans les systèmes distribués d'agents?
(DMVCC, event sourcing, etc.)

Basé sur les sources fournies, l'état de l'art (SOTA) concernant les checkpoints et les rollbacks dans les systèmes distribués d'agents a évolué. Il ne s'agit plus seulement de sauvegarder des données binaires, mais de gérer la persistance de l'état cognitif (contexte, raisonnement, mémoire) et la cohérence transactionnelle entre des agents autonomes.
Voici une synthèse structurée des mécanismes identifiés :
1. Event Sourcing et "Time Travel" (Couche Application)
L'approche dominante pour l'orchestration moderne (comme dans LangGraph ou Google ADK) repose sur l'enregistrement immuable des événements plutôt que sur des instantanés d'état simples.
• Persistance par "Super-steps" (LangGraph) : Le framework LangGraph utilise des checkpointers intégrés qui sauvegardent un instantané de l'état du graphe à chaque "super-étape" d'exécution. Ces checkpoints sont sérialisés et stockés dans des threads, permettant le Time Travel : on peut revenir à n'importe quel point passé, inspecter l'état, et bifurquer (fork) l'exécution pour explorer des trajectoires alternatives ou corriger une erreur ("Human-in-the-loop"),.
• Enregistrements d'Événements Typés (Google ADK) : Au lieu de stocker des chaînes de prompts brutes, Google ADK capture chaque interaction (messages, appels d'outils, erreurs) comme des Event records fortement typés. Cela permet des opérations riches comme le débogage temporel et la "compaction de contexte" (résumer les vieux événements pour économiser des tokens) sans perdre la traçabilité,.
2. Checkpointing au Niveau Noyau (AIOS & Context Management)
Pour les systèmes d'exploitation d'agents (AIOS), le checkpointing descend au niveau de l'infrastructure pour gérer les ressources coûteuses des LLM (Mémoire GPU/KV Cache).
• Snapshots d'Inférence (Context Manager) : Le noyau AIOS utilise un Context Manager capable de suspendre une requête d'agent en cours. Il génère un snapshot de l'arbre de recherche (beam search tree) et des probabilités intermédiaires (logits). Lors de la reprise (rollback/resume), le système restaure cet état exact pour continuer la génération sans re-calculer le préfixe, permettant un ordonnancement préemptif efficace,.
• Mémoire Virtuelle Agentique : Le Memory Manager gère l'éviction via des politiques comme K-LRU. Lorsque la mémoire sature, l'état de l'agent (logs de conversation) est "swappé" de la RAM vers le disque, agissant comme un checkpoint persistant,.
3. Mécanismes Transactionnels et Consensus (Systèmes Distribués)
Dans les systèmes multi-agents décentralisés, le rollback est utilisé pour garantir la sécurité et la cohérence face aux comportements malveillants ou aux erreurs stochastiques.
• Transactions Longue Durée (Saga Pattern) : Le framework SagaLLM est cité comme une solution pour garantir l'intégrité transactionnelle. Il utilise un registre structuré (ledger) pour suivre les objectifs et les plans. En cas d'échec, il déclenche des mécanismes de compensation ou de rollback pour revenir à un état cohérent, géré par un coordinateur centralisé,.
• Rollups Optimistes (OTR) : L'architecture Optimistic TEE-Rollups applique le principe des rollups optimistes de la blockchain aux agents. L'exécution est supposée correcte (optimiste) et finalisée rapidement. Cependant, une fenêtre de dispute permet de soumettre une preuve de fraude. Si une divergence est prouvée, le système effectue un rollback de l'état incorrect et pénalise l'agent fautif,.
• Consensus BFT et Exécution Spéculative : Dans les approches tolérantes aux pannes byzantines (BFT), les agents peuvent exécuter des tâches de manière spéculative. Si le consensus sur le résultat n'est pas atteint (par exemple, désaccord entre répliques), le système effectue un rollback vers le dernier état validé par le quorum (checkpoint stable),.
4. Rollback Sémantique et Auto-Amélioration
Enfin, une nouvelle classe de rollbacks "cognitifs" émerge, où l'agent décide lui-même de revenir en arrière.
• Mécanismes Explicites : Des travaux récents explorent l'amélioration des agents web avec des mécanismes de rollback explicites, leur permettant d'annuler des actions de navigation (ex: cliquer sur un mauvais lien) pour explorer d'autres branches.
• Auto-Correction (Self-Improving Agents) : Pour les agents "Gödel" qui modifient leur propre code, le rollback est une sécurité critique. Si une auto-modification entraîne une régression de performance (détectée par benchmark), l'agent restaure automatiquement la dernière version saine de son propre code (version control automatisé),.
Résumé Technique
Niveau
Technologie Clé
Mécanisme de Checkpoint
Mécanisme de Rollback
Application
LangGraph, ADK
Sauvegarde d'état immuable à chaque "Super-step".
Replay d'historique, Fork de thread.
Noyau (OS)
AIOS Kernel
Snapshot des Logits/KV-Cache et Arbre de recherche.
Restauration de contexte pour reprise d'inférence.
Distribué
SagaLLM, OTR
Logs de transactions distribués (Ledger).
Compensation transactionnelle ou preuve de fraude.
Cognitif
Web Agents
Mémorisation des actions environnementales.
Retour explicite à l'état précédent (Navigation).
Comment DMVCC assure-t-il la cohérence des données entre agents ?
Quels sont les avantages de l'event sourcing pour le débogage ?
Comment l'IA gère-t-elle les rollbacks lors d'échecs de transactions ?
Quelle différence entre Free-MAD et CP-WBFT? Quand utiliser
l'une vs l'autre pour éviter les hallucinations collectives?

Basé sur les documents fournis, Free-MAD et CP-WBFT représentent deux philosophies opposées mais complémentaires pour résoudre le problème des hallucinations collectives et des erreurs dans les systèmes multi-agents.
Voici une analyse détaillée de leurs différences et des scénarios d'utilisation optimaux pour chacun.
1. Différences Fondamentales : Philosophie et Mécanisme
La différence majeure réside dans leur rapport au consensus et à la confiance.
Caractéristique
Free-MAD (Consensus-Free Multi-Agent Debate)
CP-WBFT (Confidence Probe-based Weighted BFT)
Philosophie
Anti-Consensus. Il part du principe que la recherche du consensus pousse les modèles à "s'aligner" sur des erreurs (conformisme).
Consensus Pondéré. Il cherche à atteindre un consensus robuste en filtrant les agents "malades" (Byzantins) via des mesures de confiance.
Mécanisme Principal
Anti-Conformité & Score de Trajectoire. Utilise des prompts "Avocat du Diable" pour forcer la critique. La décision est prise en analysant l'évolution des réponses sur tout le débat, pas juste le vote final.
Sondes de Confiance (Probes). Utilise des sondes (au niveau du prompt ou des couches cachées du modèle) pour mesurer la certitude de l'agent. Les réponses sont pondérées par ce score de confiance.
Gestion de l'Hallucination
Traite l'hallucination comme un phénomène social (pression des pairs) qu'il faut briser par la dissidence.
Traite l'hallucination comme une panne byzantine (faute système) qu'il faut isoler par la redondance et la pondération.
Infrastructure
Logiciel pur (Prompting avancé, scoring algorithmique).
Souvent lié à une topologie réseau (graphe, étoile) et potentiellement à des accès "white-box" pour les sondes internes (HCP).
2. Analyse Détaillée pour éviter les Hallucinations Collectives
Free-MAD : Contre le "Silent Agreement" (L'accord silencieux)
Free-MAD a été conçu spécifiquement pour contrer le biais de conformité. Dans les systèmes classiques, si un agent hallucine une réponse fausse avec assurance, les autres ont tendance à valider cette erreur pour être "cohérents".
• L'innovation : Il introduit un mode Anti-Conformité où les agents sont explicitement incités à identifier les failles des autres. De plus, il utilise un mécanisme de décision basé sur la trajectoire : si un agent change d'avis tardivement pour suivre le groupe, ce changement est pondéré différemment pour éviter que le groupe ne converge vers une erreur.
• Performance : Il est très efficace pour le raisonnement complexe (maths, logique) et fonctionne bien même avec un seul tour de débat (réduction des coûts).
CP-WBFT : Contre les "Failles Byzantines" (La majorité corrompue)
CP-WBFT aborde le problème sous l'angle de la fiabilité distribuée. Il est conçu pour des environnements où une grande partie des agents (jusqu'à 85,7%) peut être défaillante ou malveillante.
• L'innovation : Il ne compte pas les voix (1 agent = 1 voix), mais pèse la crédibilité. Il utilise le HCP (Hidden-level Confidence Probing) pour extraire la "vraie" confiance du modèle depuis ses activations internes, ce qui est plus fiable que ce que le modèle dit textuellement. Un agent qui hallucine a souvent une signature interne de faible confiance, ce qui permet au système de l'ignorer même s'il est bavard.
• Performance : Il excelle dans les topologies réseaux variées et garantit la sécurité même lorsque la majorité des agents se trompent, à condition qu'au moins un agent fiable soit très confiant.
3. Guide de Décision : Quand utiliser l'un ou l'autre ?
Utiliser Free-MAD si :
1. Votre priorité est le Raisonnement Logique / Créatif : Pour des tâches comme les mathématiques ou la résolution d'énigmes où la majorité a souvent tort au début. Free-MAD empêche les agents intelligents de s'aligner sur les agents médiocres.
2. Vous avez un budget limité (Tokens) : Free-MAD obtient d'excellents résultats avec un seul tour de débat (R=1), là où les méthodes de consensus nécessitent plusieurs allers-retours pour converger.
3. Vous utilisez des modèles "Black Box" (API) : Free-MAD repose sur du prompt engineering et l'analyse de texte, donc il fonctionne avec n'importe quel LLM via API (GPT-4, Claude) sans accès aux poids du modèle.
Utiliser CP-WBFT si :
1. L'environnement est Hostile ou Très Bruité : Si vous craignez que plus de 50% de vos agents soient compromis (injections de prompt) ou hallucinent massivement. CP-WBFT peut maintenir la vérité même avec ~85% d'agents défaillants.
2. Vous avez accès aux modèles (White Box / Local) : Pour tirer le meilleur parti de CP-WBFT, l'utilisation de sondes sur les couches cachées (HCP) est recommandée car elle détecte mieux l'incertitude que le texte seul.
3. La Sécurité est critique : Pour des tâches d'évaluation de sécurité (Safety Assessment) où il faut absolument filtrer les réponses toxiques ou dangereuses, la pondération par confiance est plus robuste.
En résumé : Utilisez Free-MAD pour améliorer l'intelligence et la précision du raisonnement en brisant la pensée de groupe. Utilisez CP-WBFT pour garantir la fiabilité et la robustesse du système face à des agents défaillants ou malveillants.
Comment Free-MAD gère-t-il la conformité sans plusieurs tours ?
Comment les sondes de confiance CP-WBFT mesurent-elles la certitude ?
Quels types de modèles favorisent le mieux l'approche Free-MAD ?
Comment mesurer et comptabiliser les tokens dépensés par
agent dans un hive? Existe-t-il un standard?

D'après les sources fournies, il n'existe pas encore de standard universel unique (comme le système métrique) pour la comptabilité des tokens dans les systèmes multi-agents ("hives"). Cependant, plusieurs approches émergent pour mesurer et attribuer ces coûts, allant de standards d'observabilité technique (OpenTelemetry) à des modèles économiques décentralisés (Bittensor), en passant par des architectures de type "Système d'Exploitation" (AIOS).
Voici les principales méthodes identifiées pour comptabiliser les tokens par agent :
1. Le Standard Émergent d'Observabilité : OpenTelemetry & OpenInference
La méthode la plus standardisée actuellement pour l'industrie logicielle repose sur l'adaptation des outils de monitoring classiques aux spécificités de l'IA.
• OpenTelemetry (OTel) : Cité comme le standard clé pour les logs et les traces. Pour les agents, OTel est étendu pour capturer non seulement les requêtes HTTP, mais aussi les événements GenAI spécifiques.
• OpenInference & OpenLLMetry : Ce sont des extensions sémantiques d'OTel conçues spécifiquement pour les LLM. Elles permettent de créer des "Spans" (unités de travail tracées) qui contiennent des attributs précis : llm.token_count.prompt, llm.token_count.completion, et llm.token_count.total.
• Attribution par Agent : Dans ce modèle, chaque agent possède un identifiant. Le système de tracing (comme Traceloop ou LangSmith) agrège les "Spans" par identifiant d'agent pour reconstruire le coût total d'une tâche complexe, permettant de voir quel agent a consommé quoi lors d'une chaîne de raisonnement.
2. L'Approche "Système d'Exploitation" (AIOS & Autellix)
Dans les architectures où le LLM est vu comme un noyau (Kernel), la comptabilité des tokens est gérée comme la comptabilité des ressources CPU ou RAM dans un ordinateur classique.
• Table des Processus (Process Table) : Le système Autellix maintient une table globale des processus. Chaque agent (programme) y a une entrée qui suit ses métriques en temps réel, y compris le temps de service et les appels LLM actifs.
• Gestionnaire de Mémoire (Memory Manager) : Dans AIOS, le noyau alloue des blocs de mémoire fixes par agent. Si un agent dépasse son quota (indiquant souvent une consommation excessive de tokens de contexte), le système peut déclencher des échanges (swapping) vers le disque ou restreindre l'agent, agissant comme un mécanisme de comptabilité et de contrôle.
• Attribution des Coûts : Le noyau intercepte tous les appels système (llm_generate). Il peut donc facturer précisément chaque token généré à l'ID de l'agent (Runtime ID) qui a initié la requête, avant même que celle-ci ne parte vers l'API du modèle.
3. La Formule de Calcul Scientifique (Coût Théorique)
Dans la recherche académique (comme pour les benchmarks Free-MAD ou AgentPrune), le coût est calculé a posteriori via des formules mathématiques pour évaluer l'efficacité des protocoles de communication.
• La Formule Standard : Le coût total (TC) est la somme des tokens générés par chaque agent i à chaque round k : 
TC= 
k=0
∑
R
​
  
i=1
∑
N
​
 T 
k
i
​
 
 Où T représente les tokens.
• Analyse Structurelle : Des frameworks comme AgentPrune décomposent ce coût en fonction de la topologie du graphe de communication. Ils comptabilisent séparément les tokens liés aux "arêtes spatiales" (qui parle à qui) et "temporelles" (mémoire du passé), permettant d'identifier les agents "bavards" qui gonflent la facture inutilement.
4. L'Approche Économique Décentralisée (Bittensor)
Dans les réseaux décentralisés, la comptabilité n'est pas seulement une métrique mais la base de la rémunération.
• Preuve de Qualité et d'Utilisé : Sur Bittensor, les "Validators" évaluent les "Miners" (agents). Bien que la consommation de ressources soit implicite, la comptabilité se fait en termes de valeur (TAO). Les validateurs notent la qualité des réponses ; un agent qui dépense beaucoup de tokens (calcul lourd) pour une réponse médiocre sera pénalisé économiquement par le mécanisme de consensus Yuma.
• Comptabilité Hybride (OTR) : De nouveaux protocoles comme OTR (Optimistic TEE-Rollups) proposent de lier cryptographiquement l'exécution de l'inférence à un coût précis vérifiable, garantissant que l'utilisateur paie exactement pour le modèle et la quantité de calcul demandés, empêchant la fraude sur la comptabilité des tokens.
Résumé
Pour répondre à votre question :
1. Comment mesurer ? Utilisez une instrumentation OpenTelemetry avec les conventions sémantiques OpenInference pour taguer chaque appel LLM avec l'ID de l'agent.
2. Existe-t-il un standard ? Le standard technique est OpenTelemetry. Cependant, pour l'évaluation de la performance, le standard académique est le "Cost-per-Gain" (CPG), qui divise le coût total (tokens/argent) par le gain de performance, afin de ne pas pénaliser les agents qui "dépensent" des tokens utilement pour réussir des tâches complexes.