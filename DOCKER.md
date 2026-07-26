# Flem'Art — Déploiement Docker (générique, sans dépendance à l'IP)

## Ce que ça change

Avant : `backend/.env` et `frontend/.env` contenaient chacun l'IP locale du PC
(`192.168.2.210`), donc chaque fois que l'IP changeait (ou pour un nouveau
poste), il fallait éditer les deux fichiers.

Maintenant :
- **Un seul point d'entrée** : Nginx sert le frontend ET fait proxy vers le
  backend (`/api/*`), sur le **même port**. Le frontend appelle des URLs
  **relatives** (`/api/...`), donc il n'y a plus d'IP codée en dur nulle part
  côté client : ça marche automatiquement quel que soit l'hôte utilisé par le
  client (`localhost`, IP LAN, nom de machine...).
- **Une seule source de config** : le fichier `.env` à la racine du projet
  (basé sur `.env.example`). Les `backend/.env` et `frontend/.env` locaux ne
  sont plus utilisés par Docker (ils restent utiles seulement si vous lancez
  le projet en dehors de Docker, en dev classique).

## Démarrage

```bash
cp .env.example .env
# éditez .env : mots de passe DB, JWT_SECRET, etc.
docker compose up -d --build
```

L'application est accessible :
- Sur le PC hôte : `http://localhost` (ou `http://localhost:HOST_PORT` si vous
  avez changé `HOST_PORT` dans `.env`)
- Depuis un autre appareil du réseau local : `http://<IP-DU-PC>` (l'IP que
  Windows/Linux affiche pour la machine, ex: `ipconfig` / `ip a`)

Aucune modification du frontend n'est nécessaire pour l'accès LAN : peu
importe l'IP/hostname tapé dans le navigateur, les appels API restent sur la
même origine.

## Commandes utiles

```bash
docker compose logs -f backend      # logs backend (migrations incluses)
docker compose down                 # arrêter
docker compose down -v              # arrêter + supprimer les données MySQL
docker compose up -d --build        # rebuild après modif du code
```

Les migrations SQL (`database/migrations/*.sql`) sont appliquées
automatiquement à chaque démarrage du conteneur backend (elles ne sont
rejouées qu'une fois grâce à la table `_migrations`).

## Le seul cas où une IP doit encore être fixée : GitHub OAuth

GitHub exige une "Authorization callback URL" **fixe**, enregistrée dans les
paramètres de votre OAuth App GitHub. Si vous utilisez la connexion GitHub :

1. Fixez `PUBLIC_URL` dans `.env` sur l'URL que vos clients utiliseront
   réellement (ex: `http://192.168.2.210` ou, mieux, un nom de machine fixe
   type `http://flemart.local` si vous configurez mDNS/Avahi/Bonjour sur le
   PC hôte — ça survit aux changements d'IP DHCP).
2. Mettez la même URL + `/api/auth/github/callback` dans les paramètres de
   votre GitHub OAuth App.

C'est une contrainte de GitHub (pas de Docker) : sans connexion GitHub, vous
pouvez ignorer `PUBLIC_URL` et laisser la valeur par défaut.

## IA locale (LM Studio / Ollama)

Le backend accède au serveur IA de l'hôte via `host.docker.internal`
(configuré automatiquement dans `docker-compose.yml`), pas via `127.0.0.1`
— une adresse `127.0.0.1` dans un conteneur pointe vers le conteneur
lui-même, jamais vers votre PC. Assurez-vous simplement que LM Studio/Ollama
écoute sur toutes les interfaces (`0.0.0.0`) et pas seulement sur
`127.0.0.1`, sinon le conteneur ne pourra pas l'atteindre.

## Fichiers ajoutés/modifiés

- `docker-compose.yml` — orchestration MySQL + backend + frontend/Nginx
- `backend/Dockerfile`, `backend/.dockerignore`
- `frontend/Dockerfile`, `frontend/nginx.conf`, `frontend/.dockerignore`
- `.env.example` — config unique à la racine
- `frontend/src/config/api.ts` — URL API relative au lieu d'IP:5000 codée en dur
