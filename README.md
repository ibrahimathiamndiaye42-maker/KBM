# KEER MAAM BIRABAR — Site public + système de gestion

Application complète : site public, réservation en ligne, espace propriétaire/employée, paiements confirmés manuellement, reçus PDF numérotés, PWA installable.

```
Navigateur (PWA)  →  Frontend Vue 3 (Vercel)  →  /api (proxy Vercel)  →  Backend Express (Render)  →  PostgreSQL (Neon)
```

Le navigateur n'atteint jamais PostgreSQL. Le frontend appelle `/api` sur son propre domaine ; `vercel.json` redirige vers le backend. Le cookie de session reste ainsi « même domaine » (httpOnly, Secure, SameSite=Lax).

## Structure

```
backend/   API Express : auth, rôles, réservations, clientes, paiements, reçus, réglages
  src/db/migrations/   schéma SQL (users, clients, services, packs, reservations, payments, receipts, settings, gallery, assets)
  src/db/seed.js       services, packs et réglages par défaut (aucune coordonnée inventée)
  src/db/demo.js       données de démonstration (refuse de tourner en production)
  src/scripts/create-owner.js   création du premier compte propriétaire
frontend/  Vue 3 + Vite + PWA : site public + administration
```

## 1. Essai en local

Prérequis : Node 20+, PostgreSQL.

```bash
createdb kmb
cd backend
cp .env.example .env        # renseigner DATABASE_URL, JWT_SECRET (openssl rand -hex 32), DATABASE_SSL=false
npm install
npm run setup               # migrations + services/packs/réglages par défaut
npm run create-owner        # crée le compte propriétaire (invite interactive)
npm run dev                 # API sur http://localhost:4000

cd ../frontend
npm install
npm run dev                 # http://localhost:5173 (proxy /api → :4000)
```

Données fictives (base de test uniquement) : `npm run seed:demo`.

## 2. Mise en ligne

### a) Base PostgreSQL (ex. Neon)
1. Créer un projet sur neon.tech, copier la chaîne de connexion (`postgresql://…`).
2. Activer les sauvegardes automatiques de l'hébergeur.

### b) Backend (ex. Render → Web Service)
- Root directory : `backend` · Build : `npm install` · Start : `npm start`
- Variables d'environnement :

| Variable | Valeur |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | chaîne de connexion PostgreSQL |
| `DATABASE_SSL` | `true` |
| `JWT_SECRET` | 32+ caractères aléatoires (`openssl rand -hex 32`) |
| `CORS_ORIGIN` | URL du frontend (facultatif en production : même domaine via proxy) |

- Une fois déployé, ouvrir le « Shell » du service (ou lancer en local avec la `DATABASE_URL` de production) :
```bash
npm run migrate
npm run seed
npm run create-owner -- --nom "Nom" --email "adresse@exemple.com" --password "mot-de-passe-solide"
```
Ne jamais lancer `seed:demo` sur la base de production.

### c) Frontend (ex. Vercel)
- Root directory : `frontend` · Build : `npm run build` · Output : `dist`
- Dans `frontend/vercel.json`, remplacer `https://VOTRE-API.onrender.com` par l'URL réelle du backend.
- Aucune variable secrète côté frontend.

### d) Procédure de test après déploiement
1. `https://VOTRE-API/api/health` répond `{"ok":true}`.
2. Le site s'affiche avec les services et les prix.
3. Faire une réservation de test sur le site → message « en attente de validation ».
4. `/admin/login` : connexion avec le compte propriétaire.
5. La réservation apparaît dans **Réservations** → Confirmer → Confirmer le paiement → Générer le reçu → Voir / Télécharger / Partager.
6. Contrôler le numéro `KMB-AAAA-000001` et le contenu du PDF.
7. Se déconnecter ; `/admin` doit renvoyer vers la connexion.
8. Sur téléphone : ouvrir le site → menu du navigateur → « Ajouter à l'écran d'accueil ».
9. Supprimer la réservation de test n'est pas prévu (historique) : l'**annuler** ; pour un nettoyage complet avant la livraison, recréer la base (`npm run migrate`, `npm run seed`, `npm run create-owner`).

## 2 bis. Installer l'application sur le téléphone (employées)
- Admin → Équipe : bouton « Envoyer par WhatsApp » avec le lien `https://VOTRE-SITE/admin`.
- Android (Chrome) : ouvrir le lien, se connecter, toucher « Installer » (ou menu ⋮ → Installer l'application).
- iPhone (Safari) : ouvrir le lien, Partager → Sur l'écran d'accueil.
- L'icône « KMB Gestion » ouvre directement l'espace équipe ; l'icône « Keer Maam Birabar » installée depuis la page d'accueil ouvre le site public.
- Le HTTPS est obligatoire (fourni par Vercel).

## 2 ter. Notifications WhatsApp automatiques (réservations → WhatsApp de l'institut)
À chaque demande de réservation en ligne, le serveur envoie un message à WhatsApp avec toutes les informations (nom, téléphone, e-mail, prestation, date, heure, montant). Un échec d'envoi n'annule jamais la réservation : l'état (envoyée / échec / non activée) s'affiche dans la fiche réservation, avec un bouton « Renvoyer ». Sans configuration, tout fonctionne sauf l'envoi WhatsApp.

L'envoi automatique passe par l'**API officielle WhatsApp Business (Meta)**. Étapes (l'interface Meta évolue : suivre les intitulés) :
1. Sur developers.facebook.com : créer une application de type « Business », ajouter le produit **WhatsApp**.
2. Dans WhatsApp → « Démarrage » : noter le **Phone number ID** et générer un jeton d'accès. Pour la production, créer un **utilisateur système** (Business Manager) et un jeton permanent.
3. Test : Meta fournit un numéro d'essai ; ajouter le WhatsApp de l'institut comme destinataire autorisé et valider le code reçu.
4. Production : enregistrer un numéro dédié à l'API (un numéro déjà utilisé dans l'application WhatsApp classique ne peut pas servir tel quel) et vérifier l'entreprise.
5. Créer un **modèle de message** (catégorie Utilitaire, langue Français, nom `nouvelle_reservation`) avec ce texte exact, puis attendre son approbation :
   `Nouvelle demande de réservation n°{{1}}. Cliente : {{2}}. Téléphone : {{3}}. E-mail : {{4}}. Prestation : {{5}}. Date : {{6}}. Montant : {{7}}. Merci d'appeler la cliente pour confirmer et lui indiquer comment payer.`
6. Variables d'environnement du backend (Render) : `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_NAME=nouvelle_reservation`, `WHATSAPP_TEMPLATE_LANG=fr`.
7. Admin → Réglages : renseigner le numéro WhatsApp de l'institut (avec indicatif), puis « Envoyer un message de test ».

Sans modèle (`WHATSAPP_TEMPLATE_NAME` vide), un message texte libre est envoyé, mais WhatsApp ne l'accepte que dans les 24 h suivant un message de l'institut vers ce numéro : à réserver aux essais.

Envoi du reçu à la cliente : Admin → Réservations → Reçu → « Envoyer à la cliente ». Sur téléphone, le PDF est joint à la feuille de partage (choisir WhatsApp). Sur ordinateur, le PDF est téléchargé et la conversation WhatsApp s'ouvre : joindre le fichier.

## 3. Premiers réglages (Admin → Réglages, propriétaire)
Téléphone, WhatsApp (chiffres avec indicatif, ex. `221…`), adresse, horaires, réseaux, logo, couleurs, photos de galerie, texte « À propos », créneaux de réservation. Google Maps : sur Google Maps → Partager → Intégrer une carte → copier uniquement le lien `src="…"`.
Images : Admin → Tarifs (ouvrir un service ou un pack → image), Admin → Réglages (photo de l'établissement et galerie). Sans image, un visuel élégant avec icône est affiché automatiquement. Les photos sont réduites automatiquement avant envoi.
Admin → Tarifs : prix des services, nom/prix/description des packs (la composition des packs n'est pas pré-remplie).
Admin → Équipe : créer les comptes employées (accès aux réservations, clientes, paiements, reçus ; pas aux tarifs, réglages ni comptes).

## 4. Règles métier à connaître
- Réservation en ligne : statut EN ATTENTE, paiement en attente. Le prix vient toujours de la base, jamais du navigateur.
- Paiement : confirmé manuellement (espèces, Wave, Orange Money, autre). Aucune intégration de paiement.
- Reçu : possible uniquement après paiement confirmé ; un seul reçu par prestation ; numéro généré par la base de façon atomique ; après émission, prestation, montant et paiement sont figés.
- Une réservation dont le paiement est confirmé ne peut plus être annulée.
- Services/packs : désactivés plutôt que supprimés, pour garder l'historique.
- Logo et galerie sont stockés dans PostgreSQL (aucun disque à gérer).

## 5. Sécurité
Mots de passe bcrypt · session JWT en cookie httpOnly · rôles contrôlés côté backend · compte désactivé = accès coupé immédiatement · validation Zod · limitation de débit (connexion, réservations) · en-têtes helmet · protection CSRF (SameSite + en-tête personnalisé) · secrets en variables d'environnement uniquement.
