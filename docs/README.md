# Suivi Arbitres Handball

Application web progressive (PWA) de suivi et d'évaluation des arbitres de handball, conçue pour une utilisation sur smartphone pendant un match.

> © Vincent Guerlach — Tous droits réservés

---

## Présentation

**Suivi Arbitres Handball** est une application légère, entièrement hors ligne, permettant à un observateur d'arbitres de handball de :

- configurer un match (équipes, arbitres, compétition, date/heure) ;
- chronométrer le match avec gestion des mi-temps et des prolongations ;
- suivre le score et les temps morts (TME) ;
- saisir des observations horodatées sur chaque arbitre, catégorisées et qualifiées (conforme / non conforme) ;
- générer une synthèse filtrée en fin de match ;
- exporter un rapport complet au format PDF ;
- consulter l'historique des matchs précédents.

---

## Structure du projet

```
├── index.html          # Point d'entrée HTML (toutes les vues)
├── app.js              # (optionnel / legacy)
├── styles.css          # Feuille de styles complète (responsive, dark mode)
├── theme-init.js       # Initialisation du thème avant le rendu (évite le flash)
├── manifest.json       # Manifeste PWA
├── sw.js               # Service Worker (cache hors ligne)
├── logo.png            # Logo FFHandball
└── js/
    ├── main.js         # Point d'entrée ES module — import, exposition window, init
    ├── state.js        # État partagé, constantes (catégories, durées, clés localStorage)
    ├── match.js        # Cycle de vie du match (démarrer, terminer, retour accueil)
    ├── timer.js        # Chronomètre, gestion des périodes, prolongations, recalage
    ├── score.js        # Score et gestion des temps morts (TME)
    ├── observations.js # Formulaire d'observation, tri, rendu du tableau
    ├── synthesis.js    # Tableau de synthèse par catégorie avec filtres
    ├── pdf.js          # Export PDF (chargement lazy de jsPDF + autoTable)
    ├── storage.js      # Persistance localStorage, reprise de match, historique
    ├── ui.js           # Thème clair/sombre, alertes, questionnaire d'évaluation
    └── utils.js        # Fonctions utilitaires (formatage temps, dates)
```

---

## Fonctionnalités détaillées

### Écran de configuration (Setup)
- Saisie de la date, heure, compétition, équipes et noms des deux arbitres.
- Détection automatique d'un match interrompu (bannière de reprise).
- Pré-remplissage de la date et heure courante.

### Écran principal (Match)
- **Chronomètre** : démarrage / pause, recalage manuel (mm:ss), badge de période (MT1 / MT2 / Prolongations).
- **Score** : incrémentation/décrémentation par équipe, mémorisation du score à la mi-temps.
- **Temps morts (TME)** : tableau par équipe, ajout horodaté, pause automatique du chrono.
- **Contexte du match** : zone de texte libre (notes, ambiance, niveau des équipes).
- **Formulaire d'observation** :
  - Sélection de l'arbitre concerné (Arbitre 1 / Arbitre 2).
  - Qualification : *Action conforme* (vert) ou *Action non conforme ou manquante* (rouge).
  - Catégorie parmi : SPP, SPA, J7M, Protocole, PF, MB, Jeu Passif, Marcher, Pied, Reprise de dribble, Zone, Continuité, Placement, Déplacement, Zone d'influence, Autres.
  - Commentaire obligatoire.
  - Horodatage capturé au premier clic sur le formulaire.
- **Tableau des observations** : tri par heure, catégorie, arbitre ou type.

### Écran de fin de match (Synthèse)
- Score final avec rappel du score à la mi-temps.
- Questionnaire d'évaluation générale (esprit, engagement physique, niveaux équilibrés).
- Synthèse par catégorie avec filtres croisés (arbitre × période × type × tri).
- Tableau complet de toutes les observations.
- Commentaire global libre.
- **Export PDF** : rapport complet généré côté client via jsPDF + autoTable (chargement à la demande).

### Historique
- Liste des matchs exportés, avec réexport PDF possible depuis l'historique.
- Suppression individuelle de matchs.

### Thème
- Mode clair / sombre avec détection automatique des préférences système.
- Bascule manuelle persistante (localStorage).

---

## Architecture technique

| Aspect | Détail |
|---|---|
| Type | Application web progressive (PWA) |
| Langage | HTML5, CSS3, JavaScript ES Modules (sans framework) |
| Persistance | `localStorage` (deux clés : `arbitres_hb_current` et `arbitres_hb_history`) |
| Hors ligne | Service Worker (`sw.js`) — cache automatique des assets |
| Export | jsPDF 2.5.1 + jsPDF-autoTable 3.8.2 (CDN cdnjs, chargement lazy) |
| Responsive | Optimisé smartphone (viewport fixe, `user-scalable=no`, Apple Pencil supporté) |
| Installation | Installable sur iOS (Apple Touch Icon, `apple-mobile-web-app-capable`) et Android |

### Gestion de l'état
L'état du match est centralisé dans `js/state.js` et exporté par référence. Les mutations sont donc visibles dans tous les modules sans import circulaire. La sauvegarde automatique (`autosave`) sérialise un snapshot complet dans `localStorage` à chaque action significative.

### Registre central `window.App`
Pour éviter les imports circulaires entre modules, `main.js` construit un registre central (`window.App`) qui expose toutes les fonctions publiques. Les attributs `onclick` HTML font référence à des alias exposés directement sur `window`.

---

## Installation et utilisation

### Utilisation directe (navigateur)
1. Décompresser l'archive.
2. Ouvrir `index.html` dans un navigateur moderne (Chrome, Firefox, Safari, Edge).
3. Pour profiter du mode hors ligne, servir les fichiers via un serveur HTTP local.

### Serveur local rapide (Python)
```bash
cd "Suivi_arbitres bonne version logo acceuil + Version smartphone organisation conforme et fiable"
python3 -m http.server 8080
# Ouvrir http://localhost:8080
```

### Serveur local rapide (Node.js)
```bash
npx serve .
```

### Installation PWA sur smartphone
1. Ouvrir l'URL dans Safari (iOS) ou Chrome (Android).
2. Utiliser *Partager → Sur l'écran d'accueil* (iOS) ou *Installer l'application* (Android).
3. L'application est disponible hors ligne après la première visite.

> **Note** : Le Service Worker ne fonctionne que sur HTTPS ou `localhost`. Sur un réseau local, utiliser un certificat auto-signé ou un tunnel (ngrok, Cloudflare Tunnel, etc.).

---

## Dépendances externes

| Bibliothèque | Version | Usage | Chargée |
|---|---|---|---|
| [jsPDF](https://github.com/parallax/jsPDF) | 2.5.1 | Génération PDF | À la demande (CDN) |
| [jsPDF-autoTable](https://github.com/simonbengtsson/jsPDF-AutoTable) | 3.8.2 | Tableaux dans le PDF | À la demande (CDN) |

Aucune dépendance npm. Aucun bundler requis.

---

## Catégories d'observations

| Code | Libellé complet |
|---|---|
| SPP | Sanction — Pénalité Progressive |
| SPA | Sanction — Pénalité / Avertissement |
| J7M | Jet de 7 mètres |
| Protocole | Protocole arbitral |
| PF | Faute personnelle |
| MB | Mêlée / Balle disputée |
| Jeu Passif | Jeu passif |
| Marcher | Marcher |
| Pied | Faute de pied |
| Reprise de dribble | Reprise de dribble |
| Zone | Violation de zone |
| Continuité | Continuité du jeu |
| Placement | Placement des arbitres |
| Déplacement | Déplacement des arbitres |
| Zone d'influence | Zone d'influence |
| Autres | Autre action (précision libre) |

---

## Licence

© **Vincent Guerlach** — Tous droits réservés.  
Usage réservé à l'auteur et aux personnes expressément autorisées.
