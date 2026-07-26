# Flem'Art

Flem'Art est une application web de gestion et de partage de projets de programmation avec des fonctionnalités sociales, d'apprentissage et de motivation.

## Fonctionnalités

- **Authentification** : Inscription, connexion, connexion avec GitHub
- **Gestion de projets** : Créer, modifier, supprimer et afficher des projets avec différents statuts (réussi, en cours, classé, abandonné)
- **Apprentissage** : Liste de ressources d'apprentissage, recherche de solutions
- **Notifications** : Activité, motivation, harcèlement
- **Jeu de langues** : Système de niveaux et déblocage de langues
- **Thème** : Mode clair et sombre
- **Langues** : Français et Anglais
- **Chatbot** : Assistant IA

## Technologies

- **Front-end** : React.js + TypeScript + TailwindCSS
- **Back-end** : Express.js + TypeScript
- **Base de données** : MySQL

## Installation

### Front-end

```bash
cd frontend
npm install
npm run dev
```

### Back-end

```bash
cd backend
npm install
npm run dev
```

## Configuration

1. Configurez la base de données MySQL
2. Copiez le fichier `.env.example` en `.env` et remplissez les variables
3. Exécutez les migrations de base de données
4. Exécutez les seeds pour les données initiales

## Tests

```bash
# Front-end
cd frontend
npm test

# Back-end
cd backend
npm test
```

## API

L'API est accessible à l'adresse `http://localhost:5000/api`

### Endpoints

- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Obtenir l'utilisateur connecté
- `GET /api/projects` - Liste des projets
- `POST /api/projects` - Créer un projet
- `GET /api/projects/:id` - Détails d'un projet
- `PUT /api/projects/:id` - Mettre à jour un projet
- `DELETE /api/projects/:id` - Supprimer un projet
- `GET /api/notifications` - Liste des notifications
- `PUT /api/notifications/:id/read` - Marquer comme lu
- `DELETE /api/notifications/:id` - Supprimer une notification
- `GET /api/learning` - Liste des ressources d'apprentissage
- `POST /api/learning/search` - Rechercher une solution
