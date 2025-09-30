# ApplyFlow Backend - Running in Background

## 🚀 Options pour exécuter le backend en arrière-plan

### Option 1: PM2 (Recommandé pour production)

PM2 est un gestionnaire de processus qui maintient votre application en vie même après un redémarrage.

#### Installation et utilisation :

```bash
# Démarrer en mode production
npm run prod

# Vérifier le statut
npm run status

# Voir les logs en temps réel
npm run logs

# Redémarrer
npm run prod:restart

# Arrêter
npm run prod:stop

# Supprimer complètement
npm run prod:delete
```

#### Ou utilisez le script de gestion :

```bash
# Démarrer
./manage.sh start

# Statut
./manage.sh status

# Logs
./manage.sh logs

# Arrêter
./manage.sh stop

# Redémarrer
./manage.sh restart
```

### Option 2: nohup (Simple)

Pour un processus simple en arrière-plan :

```bash
# Démarrer en arrière-plan
./start-background.sh

# Arrêter
./stop-background.sh

# Voir les logs
tail -f ./logs/backend.log
```

## 📊 Surveillance

### Avec PM2 :
```bash
# Dashboard en temps réel
pm2 monit

# Statut détaillé
pm2 show applyflow-backend

# Logs avec timestamp
pm2 logs applyflow-backend --timestamp
```

### Avec nohup :
```bash
# Voir les logs en continu
tail -f ./logs/backend.log

# Vérifier si le processus fonctionne
ps aux | grep "node app.js"
```

## 🔧 Configuration

### Variables d'environnement (à configurer) :

```bash
export NODE_ENV=production
export PORT=3000
export DATABASE_URL="file:./prisma/database.db"
```

### Fichiers de configuration :

- `ecosystem.config.json` - Configuration PM2
- `logs/` - Dossier des logs
- `backend.pid` - PID du processus (nohup)

## 🚨 Dépannage

### Si le port 3000 est occupé :
```bash
# Trouver le processus qui utilise le port
lsof -i :3000

# Tuer le processus
kill -9 <PID>
```

### Redémarrage automatique au boot (PM2) :
```bash
# Sauvegarder la configuration PM2
pm2 save

# Générer le script de démarrage
pm2 startup

# Suivre les instructions affichées
```

## 📁 Structure des logs

```
backend/
├── logs/
│   ├── backend.log      # Logs nohup
│   ├── pm2-error.log    # Erreurs PM2
│   ├── pm2-out.log      # Sortie PM2
│   └── pm2-combined.log # Logs combinés PM2
├── ecosystem.config.json # Config PM2
├── manage.sh            # Script de gestion
├── start-background.sh  # Démarrage nohup
└── stop-background.sh   # Arrêt nohup
```