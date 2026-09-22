<p align="center">
  <img src="./assets/le-tavernier.png" alt="Logo du Tavernier" width="200">
</p>

# 🍺 Le Tavernier

Bot Discord TypeScript autonome pour la Taverne de Tata : annonces Twitch et YouTube, crosspost social, clips, anniversaires, rôles, giveaways persistants et réponses RP locales.

## Prérequis

- Node.js 20 à 24
- npm 10 ou plus récent
- une application Discord configurée

## Installation

```bash
npm ci
cp .env.example .env
npm run check
npm start
```

Le fichier `.env` contient les secrets et ne doit jamais être partagé ni commité. Sur Sparked, les valeurs restent dans la page **Startup / Variables** du serveur.

## Commandes de maintenance

| Commande | Usage |
|---|---|
| `npm run typecheck` | Vérifie TypeScript sans produire de fichiers |
| `npm test` | Lance les tests locaux sans appeler les API externes |
| `npm run build` | Supprime puis reconstruit `dist/` |
| `npm run check` | Typecheck, tests et build propre |
| `npm run pack:deploy` | Produit le ZIP protégé pour Sparked |
| `npm run release` | Vérifie tout puis produit le ZIP |

## Organisation

```text
core/       démarrage, configuration, client Discord et cycle de vie
commands/   commandes slash
events/     événements Discord
services/   Twitch, YouTube, réseaux sociaux, anniversaires, giveaways
state/      état pause/mute du bot
utils/      fichiers JSON atomiques, embeds et helpers
data/       contenu statique et données persistantes locales
tests/      tests sans réseau
dist/       JavaScript compilé utilisé par Sparked
```

Le fichier d'entrée `index.ts` ne fait plus que câbler ces modules. Chaque service externe démarre isolément : l'échec d'une API ne bloque pas les autres.

## Données persistantes

Les fichiers suivants sont créés et modifiés au runtime, puis ignorés par Git et par le ZIP de déploiement :

- `data/giveaways.json` et `data/backups/`
- `data/roles.json` et `data/reaction-map.json`
- `data/last_posts.json`, `data/last_youtube.json`, `data/twitch_clips_state.json`
- `data/anniv-cache.json`, `data/presenter.json`, `data/tavernier_state.json`

Un fichier existant ou corrompu n'est jamais remplacé silencieusement au démarrage. Les petites écritures importantes passent par un remplacement atomique.

## Contrôle du bot

`/bot status` affiche l'état des publications, des réponses et réactions d'ambiance, la version Node, l'uptime et l'état de configuration des services. `/bot pause` bloque les publications automatiques ; `/bot mute` coupe les réponses RP et les réactions d'ambiance.

Le bot répond aux mentions avec sa banque locale `data/tavernReplies.json`, sans dépendre d'un service conversationnel externe.

`/testcrosspost` teste une seule plateforme à la fois (X/Twitter par défaut) et remonte désormais le vrai diagnostic d'API.

## Déploiement

Lire [DEPLOY-SPARKED.md](./DEPLOY-SPARKED.md) avant toute mise à jour. La procédure protège explicitement le giveaway en cours et les autres données vivantes.

## Services

- Discord.js 14
- Twitch Helix
- YouTube RSS/API
- X API v2 avec OAuth 1.0a User Context
- Facebook Graph API, Bluesky et Threads
- Google Sheets pour les anniversaires
- réponses RP locales depuis `data/tavernReplies.json`

Licence ISC.
