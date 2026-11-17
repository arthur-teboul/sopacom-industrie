# Sopacom Industrie — refonte du site · documentation de lancement

## 1. Ouvrir le site

- **Consultation locale** : ouvrir `index.html` dans un navigateur récent (Chrome, Edge, Firefox ou Safari).
- **Pour que la visionneuse PDF intégrée fonctionne dans tous les navigateurs**, il vaut mieux servir le dossier par un petit serveur local :
  - Python : `python3 -m http.server 8000`, puis ouvrir `http://localhost:8000`
  - Node : `npx serve .`
- **Mise en ligne** : il suffit de copier le dossier tel quel sur n'importe quel hébergement de fichiers statiques. Aucune base de données ni compilation n'est nécessaire.

## 2. Structure

```
index.html                 Accueil (hero 3D animé + rendu Sopacom interactif, étapes 01 → 05) — thème sombre sur tout le site
entreprise.html            L'entreprise (histoire, accompagnement, BE / fabrication / showroom)
solutions.html             Vue d'ensemble des 8 gammes
technicord.html … incontournables.html   Une page par gamme
fonctionnement.html        Explorateur 3D (Three.js)
secteurs.html              6 univers sectoriels
references.html            Réalisations (filtres + visionneuse)
documentation.html         Bibliothèque documentaire (recherche, filtres, visionneuse PDF)
bibliotheque-technique.html  Bibliothèque technique : 241 blocs AutoCAD (filtres gamme / famille / longueur, recherche, tri, plan zoomable, DWG)
contact.html               Coordonnées + formulaire (ouvre la messagerie)
avant-apres.html           Comparateur site actuel / refonte
mentions-legales.html, credits.html, 404.html, sitemap.xml, robots.txt
assets/css/sopacom.css     Feuille de style unique
assets/js/app.js           Interactions (GSAP + ScrollTrigger, défilement fluide Lenis, transitions)
assets/js/laverie3d.js     Scène 3D partagée (thème sombre pour l'accueil, clair pour l'explorateur)
assets/js/hero3d.js        Hero 3D de l'accueil (visite automatique des étapes)
assets/js/explorer.js      Explorateur 3D
assets/js/v7.js            Intro, curseur, « Ma sélection » (♥), sélecteur de zones sur le rendu, rail de chapitres, bandeau
assets/js/biblio.js        Bibliothèque technique
assets/img/cao/            Aperçus SVG des blocs AutoCAD (accueil)
assets/img/cao-hd/         Aperçus SVG à contraste renforcé (bibliothèque, fiches, pages gammes)
assets/cao/                Blocs DWG de la bibliothèque Sopacom (≈ 40 Mo)
assets/data/cao.json       Catalogue issu du menu AutoCAD (CUIX)
assets/vendor/             three.min.js r128, OrbitControls.js, gsap.min.js, ScrollTrigger.min.js, lenis.min.js
assets/fonts/              Fraunces, Inter, IBM Plex Mono (licence OFL, auto-hébergées)
assets/img/produits/       59 photos et rendus extraits des PDF Sopacom
assets/img/site/           Photos et visuels du site actuel
assets/docs/               4 PDF Sopacom transmis
```

## 3. Actions à faire par Sopacom avant la mise en ligne

| Élément | Action |
|---|---|
| Logo | Le logo officiel transmis est utilisé tel quel, sur l'en-tête et le pied de page noirs (choix validé). Une version SVG, si elle existe, améliorerait la netteté sur écrans haute définition. |
| Fiches PDF manquantes | Transroll, Technilift, Tri sélectif, Tabling, Incontournables et les versions EN pointent vers le site actuel : les copier dans `assets/docs/` et mettre à jour les liens. |
| Modèles 3D | Aucun modèle n'a été transmis. L'explorateur est une maquette de principe ; il pourra être reconstruit à partir d'exports GLB issus de SolidWorks. |
| Mentions légales | Raison sociale, RCS, TVA, hébergeur, directeur de publication, politique de confidentialité. |
| Formulaire | Brancher un traitement côté serveur (et une mention RGPD) si l'envoi direct est souhaité. |
| Légendes des réalisations | Lieu, client, date et configuration de chaque photo. |
| Autorisations clients | Accord des clients cités sur la page Références. |
| Photos HD | Atelier, bureau d'études, Sushi / Pizza Concept : les images actuelles sont en basse définition. |

Tous ces points sont aussi signalés dans les pages par un encadré « À compléter / à confirmer ».

## 3 bis. Bibliothèque technique (AutoCAD)

- Source : archive `autocad_sopacom.zip` transmise (menu CUIX + 242 fichiers DWG).
- 248 entrées de menu, 240 blocs distincts ; 241 fiches publiées (un même bloc peut figurer sous deux libellés).
- Le bloc **A2AIGDR** est référencé dans le menu mais absent des DWG transmis : non publié, à fournir si besoin.
- Les aperçus SVG sont convertis automatiquement (traits et aplats seulement ; textes et cotes non reproduits). Le DWG fait foi.
- Les longueurs filtrables sont celles lues dans les libellés du menu (107 blocs) ; les autres sont des éléments sans longueur indiquée.
- « Ma sélection » est stockée dans le navigateur du visiteur (aucun envoi) et reprise dans le message du formulaire de contact.

## 3 ter. Ajustements de lisibilité (v7.1)

- Accueil : aucune modification (fichier `index.html` identique, vérifié par comparaison).
- Bibliothèque technique et fiche bloc : traits des plans plus clairs et plus épais, aplats renforcés, séparations des cartes plus visibles, textes secondaires éclaircis.
- Pages gammes : mêmes plans à contraste renforcé dans la section « Bibliothèque technique ».
- Fonctionnement : éclairage de la scène 3D renforcé (option propre à l'explorateur), étiquettes inactives plus lisibles, étapes et textes secondaires plus contrastés.

## 4. Règles de contenu appliquées

- Les textes et caractéristiques proviennent uniquement des 4 PDF Sopacom et du site actuel. La source est indiquée sous chaque bloc.
- Les éléments demandés mais absents des documents sont marqués **« à confirmer »**. C'est le cas, par exemple, des rouleaux coniques Transroll et des valeurs des 6 longueurs du Technicord.
- Les correspondances entre secteurs et gammes sont des **propositions**, signalées comme telles et à valider par Sopacom.
- Aucune image tierce : toutes les photos et tous les rendus sont des visuels Sopacom.

## 5. Accessibilité, référencement, performances

- **Accessibilité** :
  - lien d'évitement et repères sémantiques (`header`, `nav`, `main`, `footer`) ;
  - fil d'Ariane ;
  - boutons avec `aria-pressed` ;
  - focus visible ;
  - textes alternatifs ;
  - prise en compte du réglage système « réduire les animations ».
- **Référencement** :
  - titre et description propres à chaque page ;
  - URL canonique et balises Open Graph ;
  - données structurées `Organization` (schema.org) ;
  - `sitemap.xml` et `robots.txt`.
- **Fluidité** : défilement doux (Lenis) synchronisé avec les animations, transitions entre pages, titres révélés mot à mot, images dévoilées, boutons magnétiques. Tout est désactivé si « réduire les animations » est activé.
- **Performances** :
  - polices auto-hébergées, sans appel externe ;
  - images optimisées (1 600 px maximum) et chargées à la demande ;
  - la 3D n'est chargée que sur l'accueil et la page Fonctionnement ;
  - le rendu 3D est mis en pause quand il sort de l'écran.
- **Solution de repli** : sans WebGL, l'explorateur affiche un rendu Sopacom à la place de la scène 3D. Sans JavaScript, tout le contenu reste visible.

## 6. Modifier le site

Les pages ont été générées par un script à partir d'un fichier de contenu. Pour une modification ponctuelle, éditer directement le HTML concerné. Les couleurs et les polices sont définies par des variables en tête de `assets/css/sopacom.css` (`--orange`, `--ivory`, etc.).

## 7. Tests réalisés

- Les 21 pages ont été testées en 1440 × 900 et 390 × 844 :
  - aucune erreur JavaScript ;
  - aucun lien interne ni ancre cassés ;
  - aucune image manquante ;
  - aucun débordement horizontal.
- Les interactions suivantes ont été vérifiées :
  - annotations de l'accueil ;
  - étapes, vue éclatée et isolement dans l'explorateur ;
  - menu mobile ;
  - filtres et visionneuses ;
  - comparateur avant / après ;
  - bibliothèque technique (filtres, curseur de longueur, fiche, zoom, navigation clavier, lien direct `#CODE`) ;
  - sélection ♥ (ajout, tiroir, reprise dans le formulaire de contact) ;
  - sélecteur de zones sur le rendu et hero piloté par le défilement ;
  - absence de chevauchement dans le hero en 1280 × 640, 1440 × 900, 1800 × 760 et 1920 × 1080.
- Une sauvegarde de la version initiale est livrée à part : `sauvegardes/version-initiale-transmise.zip`.
