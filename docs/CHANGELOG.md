# CHANGELOG — Suivi Arbitres Handball

Toutes les modifications notables de l'application sont documentées ici.  

## [0.3.2] — 2026-03-29

### Ajouté
- `main.js` — **politique de mot de passe centralisée** avec 5 critères : 8 caractères minimum, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial. Fonction `validatePassword()` unique utilisée partout.
- `main.js` + `index.html` — **coches dynamiques en temps réel** : dans la modale de changement de mot de passe utilisateur et dans le formulaire de création admin, chaque critère s'affiche avec un indicateur visuel (○ gris → ✓ vert) qui se met à jour à chaque frappe.
- Politique appliquée uniformément : changement de mot de passe utilisateur, création de compte admin, et réinitialisation de mot de passe admin.

### Modifié
- `main.js` — le nouveau mot de passe doit obligatoirement être différent de l'actuel (modale utilisateur).
- `sw.js` — version du cache passée à `v25`.

---

## [0.3.1] — 2026-03-29

### Ajouté
- `auth.js` — nouvelle fonction `changePassword(currentPassword, newPassword)` : appel API `PATCH /profile/password` pour permettre à l'utilisateur de modifier son propre mot de passe.
- `main.js` — modale de changement de mot de passe (`changePasswordUI`) avec validation côté client : champ actuel, nouveau, confirmation, contrôle de longueur (8 caractères min), vérification de correspondance, et vérification que le nouveau diffère de l'actuel.
- `index.html` — bouton **Mot de passe** ajouté dans la barre utilisateur (à côté de « Se déconnecter ») et modale overlay dédiée.
- `sw.js` — version du cache passée à `v24`.

---

## [0.3.0] — 2026-03-29

### Ajouté
- `state.js` — nouvelle catégorie **Communication** dans les Décisions techniques.
- `observations.js` — **multi-sélection des arbitres** : possibilité de cocher un ou deux arbitres sur la même observation. L'affichage combine les noms avec ` + ` (ex : « Dupont + Martin »).
- `observations.js` — **multi-sélection des catégories** : possibilité de cocher plusieurs catégories (Décisions techniques, Positionnement, Autres) sur la même observation. L'affichage combine les catégories avec ` + ` (ex : « Jet franc + Communication »). La conformité reste mutuellement exclusive (conforme OU non conforme, jamais les deux).
- `synthesis.js` — une observation multi-catégories compte **une fois dans chaque catégorie individuelle** pour le calcul de conformité par catégorie.
- `pdf.js` — même logique d'éclatement des multi-catégories dans la synthèse PDF.

### Modifié
- `styles.css` — **panneau gauche fixe** (Chronomètre, Score, TME, Contexte du match) : le panneau reste sticky lors du défilement vertical. Seules les observations et le formulaire défilent. Fonctionne en desktop (left-panel sticky dans la grille) et en mobile (sticky en haut de page).
- `state.js` — `selArb` et `selCat` passent de valeur unique (`null`) à tableaux (`[]`) pour supporter la multi-sélection.
- `sw.js` — version du cache passée à `v23`.

---

## [0.2.4] — 2026-03-29

### Corrigé
- `styles.css` — écran de connexion (`auth-screen`) mal positionné dans le coin bas-gauche : ajout de `width:100%` et `box-sizing:border-box` pour le centrer correctement.
- `js/main.js` — `submitLogin()` : ajout d'un bloc `try/catch` pour afficher un message d'erreur explicite si le serveur est injoignable (ex: certificat non accepté), au lieu d'un silence complet.
- `sw.js` — version du cache passée à `v20`.

---

## [0.2.3] — 2026-03-29

### Corrigé
- `index.html` — tous les écrans (`SS`, `MS`, `ES`, `HistS`) manquaient de `style="display:none;"` par défaut. L'écran de saisie du match et l'écran principal s'affichaient avant que le JS ait le temps de vérifier l'authentification, causant l'affichage simultané des deux écrans. Désormais tous les écrans sont masqués au chargement, seul le JS décide lequel afficher selon l'état de connexion.
- `sw.js` — version du cache passée à `v19` pour forcer le rechargement complet.

---

## [0.2.2] — 2026-03-28

### Corrigé
- `js/auth.js` — URL de l'API passée de `http://` à `https://` pour résoudre le blocage "mixed content" (GitHub Pages est en HTTPS, les navigateurs refusent les appels HTTP depuis une page HTTPS).
- `sw.js` — version du cache passée à `v18`.

### Backend
- Node.js tourne désormais en HTTPS sur le port 4000 avec un certificat auto-signé.
- Nginx écoute sur le port 443 (HTTPS) et redirige vers Node, et redirige le port 80 vers 443.

---

## [0.2.1] — 2026-03-28

### Modifié
- **Accès fermé** : l'application n'est plus accessible sans connexion. L'écran de connexion est désormais le seul point d'entrée — plus de bouton "Continuer sans compte".
- **Rôles utilisateurs** : le token JWT embarque maintenant le rôle (`user` / `admin`), stocké en localStorage.
- `js/auth.js` — suppression de `register()` (inscription publique désactivée), ajout de `isAdmin()`, `getRole()`, et des 4 fonctions admin : `adminGetUsers`, `adminCreateUser`, `adminDeleteUser`, `adminResetPassword`.
- `js/main.js` — refonte complète de la gestion de l'authentification : connexion obligatoire, redirection automatique selon l'état du token, badge email + bouton Admin (visible uniquement pour les admins).

### Ajouté
- **Espace administrateur** (`#AdminS`) : écran dédié accessible uniquement aux admins via le bouton "Admin" sur l'accueil.
  - Liste de tous les utilisateurs avec email, rôle, date de dernière connexion.
  - Formulaire de création d'utilisateur (email, mot de passe, rôle user/admin).
  - Bouton de réinitialisation du mot de passe par prompt.
  - Bouton de suppression de compte (protégé contre l'auto-suppression).
- Styles CSS pour l'écran admin et l'écran de connexion (`auth-screen`, `admin-screen`, `admin-user-row`, badges de rôle).
- `sw.js` — version du cache passée à `v17`.

### Backend (server.js)
- Route `POST /api/auth/register` supprimée — inscription réservée à l'admin.
- `last_login` mis à jour à chaque connexion réussie.
- Middleware `adminOnly` protège toutes les routes `/api/admin/*`.
- Impossible pour un admin de supprimer son propre compte.

---

## [0.2.0] — 2026-03-28

### Ajouté
- **Authentification utilisateur** (`js/auth.js`) : inscription et connexion email/mot de passe via backend MySQL sur serveur personnel. Tokens JWT stockés en localStorage, valables 30 jours.
- **Écran de connexion** dans `index.html` : formulaire inscription/connexion avec bascule entre les deux modes, message d'erreur inline, bouton "Continuer sans compte".
- **Badge utilisateur** sur l'écran d'accueil : affiche l'email connecté, bouton de déconnexion.
- **Synchronisation de l'historique** (`js/storage.js`) : les matchs sont sauvegardés sur le serveur après export PDF si l'utilisateur est connecté. L'historique charge depuis le serveur en priorité, avec fallback localStorage si déconnecté.
- **Suppression distante** de matchs depuis l'historique (`deleteHistoryRemote`).
- `js/auth.js` ajouté au cache Service Worker.
- `sw.js` — version du cache passée à `v16`.

### Architecture backend
- Serveur Node.js + Express hébergé sur serveur personnel Ubuntu
- Base de données MySQL avec tables `users` et `matches`
- API REST sécurisée via JWT : `/api/auth/register`, `/api/auth/login`, `/api/matches`, `/api/profile`
- Nginx en reverse proxy sur le port 80

---

## [0.1.4] — 2026-03-28

### Corrigé
- `styles.css` — champ Date tronqué (`28/03/202` au lieu de `28/03/2026`) sur iPhone : les inputs du `.g3` sur mobile passent à `font-size: 14px` et `padding: 11px 6px` pour que les 10 caractères de la date tiennent dans le champ. Les autres inputs (`g2`, arbitres, équipes) conservent leur `font-size: 16px` (anti-zoom iOS).
- `sw.js` — version du cache passée à `v15`.

---

## [0.1.3] — 2026-03-27

### Ajouté
- `pdf.js` — **Synthèse par catégorie** : tableau complet avec colonnes Non conf. / Conf. / Conformité, couleurs par seuil (vert ≥70%, orange ≥40%, rouge <40%), score global en titre de section.
- `pdf.js` — **Couleurs dans le tableau Observations** : fond de ligne rose pour les actions non conformes, fond vert clair pour les conformes ; colonne Type colorée et en gras.

### Modifié
- `pdf.js` — **Nom du fichier exporté** : format `Suivi_[Arbitre1]_[Arbitre2]_[EquipeA]_[EquipeB]_[Date].pdf` (caractères spéciaux et accents nettoyés).
- `pdf.js` — **Contexte du match** : vérification de saut de page avant l'écriture du bloc ; était déjà présent dans le code mais pouvait être tronqué en bas de page.
- `pdf.js` — Ajout d'une fonction `checkPage()` pour gérer proprement les sauts de page avant chaque section.
- `sw.js` — version du cache passée à `v14`.

---

## [0.1.2] — 2026-03-27

### Modifié
- `index.html` — champs Date et Heure convertis de `type="date"` / `type="time"` (inputs natifs Safari à largeur minimale non contrôlable) en `type="text"` avec `inputmode="numeric"`. Les trois champs de la section MATCH sont désormais parfaitement alignés sur une seule ligne, avec des proportions cohérentes (`1fr 1fr 1.4fr`).
- `js/main.js` et `js/match.js` — pré-remplissage de la date au format lisible `jj/mm/aaaa` (au lieu du format ISO `aaaa-mm-jj` imposé par les inputs natifs).
- `js/utils.js` — `fmtDate()` accepte désormais les deux formats : `jj/mm/aaaa` (retourné tel quel) et `aaaa-mm-jj` (converti). Assure la compatibilité avec les matchs sauvegardés en historique.
- `styles.css` — suppression des règles CSS spécifiques aux inputs natifs date/time, devenues inutiles.
- `sw.js` — version du cache passée à `v13`.

---

## [0.1.1] — 2026-03-27

### Corrigé
- `styles.css` — grille `.g3` : Safari impose une largeur minimale native aux inputs `type="date"` et `type="time"` qui empêchait les 3 colonnes de tenir sur une ligne. Correctif : `min-width: 0` et `overflow: hidden` sur les cellules `.sf`, et `font-size: 13px` + `padding` réduit sur les inputs date/time uniquement. Appliqué en desktop/iPad et mobile.
- `sw.js` — version du cache passée à `v12`.

---

## [0.1.0] — 2026-03-27

### Modifié
- `styles.css` — grille `.g3` (Date / Heure / Compétition) : retour à 3 colonnes sur une même ligne, avec proportions rééquilibrées (`1fr 1fr 1.4fr`) pour que Compétition soit légèrement plus large que Date et Heure. Appliqué aussi bien en desktop/iPad qu'en mobile (≤767px).
- `sw.js` — version du cache passée à `v11`.

---

## [0.0.9] — 2026-03-27

### Corrigé
- `styles.css` — grille `.g3` (Date / Heure / Compétition) : passage de `1fr 1fr 1fr` à `1fr 1fr` avec le champ Compétition en pleine largeur (`grid-column: 1 / -1`). Sur iPad, le champ Compétition était trop étroit ; sur iPhone, les trois champs s'empilaient verticalement.
- `styles.css` — media query mobile (≤767px) : `.g3` conserve désormais deux colonnes (`1fr 1fr`) pour que Date et Heure restent côte à côte, avec Compétition sur une ligne entière en dessous.
- `sw.js` — version du cache passée à `v10`.

---

## [0.0.8] — 2026-03-27

### Modifié
- Dossier interne du ZIP renommé de `Suivi_arbitres bonne version logo acceuil + Version smartphone organisation conforme et fiable` en `Suivi_arbitres_v0.0.8` — aligné sur le nom du fichier ZIP livré.
- Format du copyright mis à jour dans tous les pieds de page : `© 2026 Vincent Guerlach — Tous droits réservés — v0.0.8` (année placée en premier, après le symbole ©).
- `sw.js` — version du cache passée à `v9`.

---

## [0.0.7] — 2026-03-27

### Corrigé
- `main.js` — `cancelTime` importée et présente dans `window.App` mais non exposée sur `window` globalement. Le bouton "Annuler" du formulaire d'observation (onclick="cancelTime()") était silencieusement non fonctionnel.
- `sw.js` — version du cache passée à `v8`.

### Ajouté
- Protocole de tests automatisés systématique avant chaque livraison :
  - Test 1 : syntaxe JS (`node --check`) sur tous les modules
  - Test 2 : vérification croisée imports/exports entre modules
  - Test 3 : confrontation `onclick` HTML vs fonctions exposées sur `window`
  - Test 4 : cohérence liste du cache Service Worker vs fichiers réels
  - Test 5 : contrôle de la structure du ZIP (fichiers parasites)

---

## [0.0.6] — 2026-03-27

### Corrigé
- `pdf.js` ligne 111 — **erreur de syntaxe JS critique** : utilisation invalide de l'opérateur spread (`...`) à l'intérieur d'une expression ternaire (`condition ? ...arr : ...arr`). Cette syntaxe est rejetée par le moteur JS, ce qui empêchait le chargement de l'intégralité du graph de modules et rendait le bouton "Démarrer le suivi" non fonctionnel (`window.startMatch` jamais défini). Remplacé par trois appels `if/else if/else` explicites.
- `sw.js` — version du cache passée à `v7`.

Format de version : `x.y.z` — Majeur . Mineur . Patch

---

## [0.0.5] — 2026-03-27

### Corrigé
- `storage.js` — import inutile de `startTimer`/`endTimer` supprimé (causait une erreur silencieuse au chargement du module).
- `version.js` — numéro de version incorrect (`0.1.0`) corrigé en `0.0.5`.
- Suppression des doublons `CHANGELOG.md` et `README.md` à la racine (présents en double avec `docs/`).
- `sw.js` — version du cache passée à `v6`.

---

## [0.0.4] — 2026-03-27

### Corrigé
- Déplacement de `CHANGELOG.md` et `README.md` dans un sous-dossier `docs/` pour éviter que le navigateur les ouvre à la place de `index.html`.

---

## [0.0.3] — 2026-03-27

### Ajouté
- **Versioning de l'application** (`js/version.js`) : source unique de vérité pour la version (`APP_VERSION`), l'année (`APP_YEAR`) et l'auteur (`APP_AUTHOR`).
- Affichage dynamique de la version et de l'année dans tous les pieds de page (injection au chargement via `main.js`).
- Fichier `CHANGELOG.md` pour le suivi des modifications.

### Modifié
- `sw.js` — version du cache passée à `v5`, ajout de `version.js` dans les assets mis en cache.
- `manifest.json` — description mise à jour avec le numéro de version.
- Pieds de page HTML — contenu statique remplacé par injection dynamique depuis `version.js`.

---

## [0.0.2] — 2026-03-27

### Ajouté
- **Système de logs structurés JSON** (`js/logger.js`) : journal en mémoire (2 000 entrées max), exportable en `.json` via le bouton `⬇ Logs` dans le pied de page.
- Instrumentation complète de tous les modules : `match.js`, `timer.js`, `score.js`, `observations.js`, `storage.js`, `pdf.js`, `main.js`.
- Capture globale des erreurs JS non gérées et promesses rejetées.

### Modifié
- `sw.js` — version du cache passée à `v4`, ajout de `logger.js` dans les assets mis en cache.

---

## [0.0.1] — 2026-03-27

### Ajouté
- Fichier `README.md` décrivant l'architecture, les fonctionnalités et les instructions d'installation.

---

## [0.0.0] — Version initiale (avant versioning)

Première version fonctionnelle de l'application :
- Écran de configuration du match (équipes, arbitres, compétition, date/heure)
- Chronomètre avec gestion des mi-temps et prolongations
- Suivi du score et des temps morts (TME)
- Formulaire d'observations horodatées par arbitre et catégorie
- Synthèse filtrée en fin de match
- Export PDF via jsPDF + autoTable
- Historique des matchs avec réexport PDF
- Thème clair / sombre avec détection système
- Mode PWA installable (Service Worker, manifest)
