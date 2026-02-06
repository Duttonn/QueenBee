#!/bin/bash
# 🐝 ANTIGRAVITY QA WATCHER
# Surveille GSD_TASKS.md toutes les 60 secondes pour les tags [REVIEW] ou [PR OPEN]

PROJECT_DIR="~/PersonalProjects/QueenBee"
GSD_FILE="$PROJECT_DIR/GSD_TASKS.md"
LOG_FILE="$PROJECT_DIR/logs/qa-watcher.log"

# Créer le dossier logs si nécessaire
mkdir -p "$PROJECT_DIR/logs"

echo "🐝 ANTIGRAVITY QA WATCHER STARTED - $(date)" | tee -a "$LOG_FILE"
echo "📁 Monitoring: $GSD_FILE" | tee -a "$LOG_FILE"
echo "-------------------------------------------" | tee -a "$LOG_FILE"

while true; do
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Recherche des tags [REVIEW] ou [PR OPEN]
    REVIEW_TASKS=$(grep -E '\[REVIEW.*\]|\[PR OPEN.*\]' "$GSD_FILE" 2>/dev/null)
    
    if [ -n "$REVIEW_TASKS" ]; then
        echo "" | tee -a "$LOG_FILE"
        echo "🚨 [$TIMESTAMP] CIBLES DÉTECTÉES!" | tee -a "$LOG_FILE"
        echo "$REVIEW_TASKS" | tee -a "$LOG_FILE"
        echo "" | tee -a "$LOG_FILE"
        echo "⚡ ACTION REQUISE: Lancer le protocole d'inspection Antigravity" | tee -a "$LOG_FILE"
        
        # Notification système macOS
        osascript -e 'display notification "Tâche(s) en attente de REVIEW détectée(s)!" with title "🐝 ANTIGRAVITY QA" sound name "Ping"' 2>/dev/null
        
        # Jouer un son d'alerte
        afplay /System/Library/Sounds/Ping.aiff 2>/dev/null &
    else
        echo "[$TIMESTAMP] ✅ Scan OK - Aucune tâche [REVIEW] ou [PR OPEN]" | tee -a "$LOG_FILE"
    fi
    
    # Attente de 60 secondes
    sleep 60
done
