# Braquage : version en ligne (Google + Vercel)

Stack : un seul fichier `index.html` (front), une fonction `api/act.js` (serveur qui arbitre la partie et garde les rôles secrets), Firebase (connexion Google + base Firestore en temps réel), Vercel (hébergement).

## 1. Firebase (5 min)
1. https://console.firebase.google.com > **Ajouter un projet**.
2. **Authentication** > Commencer > Méthode de connexion > activer **Google**.
3. **Firestore Database** > Créer une base (mode production, la région la plus proche de vous).
4. Onglet **Règles** de Firestore : colle le contenu de `firestore.rules`, puis Publier.
5. **Paramètres du projet** (roue dentée) > Général > "Vos applications" > ajouter une **application Web** (`</>`). Copie l'objet `firebaseConfig` et colle ses 4 valeurs (apiKey, authDomain, projectId, appId) dans `index.html`, tout en haut du script.
6. **Paramètres du projet** > **Comptes de service** > "Générer une nouvelle clé privée". Un fichier JSON est téléchargé : garde-le secret (ne le mets jamais dans le code ni sur GitHub).

## 2. Vercel
1. Mets ce dossier dans un dépôt GitHub (ou utilise `npx vercel` en ligne de commande).
2. Sur https://vercel.com > **Add New > Project** > importe le dépôt. Preset : **Other**. Pas de commande de build.
3. **Settings > Environment Variables** : crée `FIREBASE_SERVICE_ACCOUNT` et colle **tout le contenu** du fichier JSON de l'étape 1.6. Puis **Deploy** (ou Redeploy).
4. Dans Firebase > Authentication > **Paramètres > Domaines autorisés** : ajoute ton domaine Vercel (ex. `braquage.vercel.app`). Sans cela, la connexion Google échoue.

## Jouer
Chaque ami ouvre l'URL Vercel, se connecte avec Google, et rejoint avec le code à 4 lettres. L'hôte (celui qui a créé la salle) lance la partie à partir de 4 joueurs.

## Sécurité
- Les rôles (dont la Taupe) ne sont connus que du serveur : chaque joueur ne peut lire que son propre dossier.
- Les votes sont stockés côté serveur et ne sont jamais envoyés aux clients.
- Les clients ne peuvent rien écrire directement dans Firestore (règles : `write: false`), tout passe par `/api/act`.

## Idées pour la suite
Supprimer les vieilles salles automatiquement (règle TTL Firestore sur un champ de date), ajouter des obstacles et des rôles dans `api/act.js` et `index.html`.
