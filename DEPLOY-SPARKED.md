# Déployer Le Tavernier sans perdre ses données

Cette version est prévue pour **Node.js 20 à 24**. L'archive de mise à jour contient le code compilé (`dist/`) mais aucun secret ni fichier d'état vivant.

## 1. Test technique en local (sans compte ni clé)

Installer Node.js 20 ou 22, extraire l'archive dans un dossier neuf, puis ouvrir PowerShell dans ce dossier :

```powershell
node --version
npm ci
npm run check
```

Cela vérifie les types, les tests et reconstruit entièrement `dist/`. Aucun `.env` n'est nécessaire pour ce contrôle.

## 2. Test fonctionnel en local

1. Copier le modèle de configuration :

```powershell
Copy-Item .env.example .env
```

2. Ouvrir `.env` dans un éditeur de texte.
3. Recopier soi-même les variables depuis la page **Startup / Variables** de Sparked. Ne jamais envoyer ce fichier à quelqu'un ni l'ajouter à Git.
4. Pour un essai prudent, désactiver d'abord les publications externes :

```env
TWITCH_ENABLED=false
TWITCH_CLIPS_ENABLED=false
TWITTER_ENABLED=false
FACEBOOK_ENABLED=false
BLUESKY_ENABLED=false
THREADS_ENABLED=false
YOUTUBE_ENABLED=false
ANNIV_ENABLED=false
MARDI_GIF_ENABLED=false
DEPLOY_COMMANDS_ON_START=false
```

5. Arrêter l'instance Sparked **avant** de lancer localement le même token Discord. Deux instances avec le même token peuvent traiter le même événement et publier en double. Un bot et une guilde de test séparés restent la meilleure solution.
6. Lancer :

```powershell
npm start
```

Pour arrêter le bot local : `Ctrl+C` dans PowerShell.

Ouvrir `http://localhost:10000/health` puis tester `/ping` et `/bot status` dans Discord.

## 3. Mise à jour sur Sparked

L'intégration Ollama est réservée au lancement local sur le PC. Laisse OLLAMA_ENABLED à false sur Sparked ; le ZIP de déploiement omet aussi le script local Windows.

Faire cette opération après la fin du giveaway en cours.

1. Télécharger une sauvegarde complète du serveur. Au minimum, conserver tout le dossier `data/`, notamment `data/giveaways.json` et `data/backups/`.
2. Arrêter le serveur.
3. Supprimer uniquement les anciens dossiers de code qui seront remplacés : `dist/`, `core/`, `commands/`, `events/`, `services/`, `state/`, `utils/`, `tools/`, `docs/` et `scripts/`. **Ne jamais supprimer `data/`.** Cette étape évite de conserver des modules retirés dans une ancienne version.
4. Envoyer le ZIP de mise à jour dans `/home/container` et l'extraire. Le ZIP omet volontairement les données vivantes : participants, rôles, caches, mémoire des posts et état du bot.
5. Vérifier que `data/giveaways.json` existe encore avant de redémarrer.
6. Vérifier que `STARTUP_FILE` vaut `dist/index.js`.
7. Redémarrer le serveur. La commande Sparked actuelle `npm install --production` fonctionne ; si le panneau permet de la modifier, `npm ci --omit=dev` est plus reproductible.

Au démarrage, les lignes essentielles sont : connexion Discord, reprise des giveaways, puis état individuel de Twitch, YouTube, anniversaires et clips. Une panne d'un service ne doit plus empêcher les autres de démarrer.

## 4. Contrôles après déploiement

1. Exécuter `/bot status`.
2. Vérifier `/ping` et un bouton non destructif.
3. Exécuter une seule fois `/testcrosspost plateforme:twitter`. Cette commande crée un vrai post de test et affiche désormais l'échec réel au lieu d'un faux succès.

Diagnostic X le plus courant :

- `401` : paire clé/jeton invalide ou régénérée ;
- `403` : application sans droit **Read and write**, jeton créé avant ce changement, ou accès/crédits API insuffisants ;
- `429` : limite temporaire atteinte.

Ne régénérer les quatre identifiants X qu'après avoir lu ce code précis. Si les permissions de l'application passent de lecture seule à lecture-écriture, il faut généralement recréer l'Access Token et son Secret.

## 5. Retour arrière

En cas de souci, arrêter le serveur, remettre la sauvegarde complète prise à l'étape 1 et redémarrer. Ne jamais restaurer un ancien dossier `data/` au-dessus de données plus récentes sans comparer d'abord `data/giveaways.json`.
