# DCS Kneeboard Generator — v1.0.5

Generateur de kneeboards (fiches de vol) pour **DCS World**. Application web 100% front-end, sans serveur : ouvrir le fichier HTML dans un navigateur suffit.

## Structure du projet

```
dcs_kneeboard.html   Application principale (CSS + HTML + JS)
miz_parser.js        Parseur de fichiers mission DCS (.miz / Lua)
dcs_airfields.js     Base de donnees des aerodromes DCS
```

## Utilisation

1. Ouvrir `dcs_kneeboard.html` dans un navigateur moderne (Chrome, Firefox, Edge)
2. Glisser ou selectionner un fichier `.miz` — ou un fichier `.kbsave` pour reprendre une session
3. Choisir la coalition et selectionner les flights PKG et supports
4. Editer les champs directement sur l'apercu
5. Ajouter des pages supplementaires si besoin
6. Sauvegarder l'etat avec **💾 Sauvegarder** (`.kbsave`) pour partager ou reprendre plus tard
7. Exporter en PDF, JPG, HTML ou imprimer

---

## Fonctionnalites

### Import et parsing de missions

- Import de fichiers `.miz` (format mission DCS — archive ZIP contenant du Lua) par clic ou drag & drop
- Import de fichiers `.kbsave` pour reprendre une session existante (drag & drop ou bouton **📂 Ouvrir**)
- Parsing automatique des donnees de mission :
  - Theatre, date, heure de depart, lever/coucher de soleil
  - Meteo : vent (sol, 2000ft, 8000ft), temperature, QNH, visibilite, nuages
  - Bullseye par coalition (blue / red)
- Detection des coalitions (bleue, rouge, neutre, toutes) avec filtre
- Filtre Players / Clients (detection via le champ `skill`)
- Support des fichiers **DTC** (Data Transfer Cartridge) embarques dans le `.miz` : surcharge automatique des steerpoints et canaux radio si un fichier `.dtc` correspondant est trouve

### Groupes aeriens

- Detection automatique des groupes aeriens (avions et helicopteres)
- Exclusion correcte des vehicules terrestres (BTR-80, BMP, etc.) y compris quand ils sont references dans les taches d'autres groupes
- Extraction par groupe :
  - Callsign, type d'appareil, task/role
  - Frequences radio UHF et VHF (jusqu'a 20 presets par radio)
  - Canal TACAN
  - Membres avec callsign individuel, numero d'appareil, datalink (STN L16)
  - Waypoints avec coordonnees (DDM), cap, distance, altitude, vitesse, ETA cumulatif
  - NavTargetPoints (F-14 et autres) affiches comme des waypoints normaux
  - Armement (pylones CLSID), fuel, chaff, flare, gun
  - Aerodrome de depart avec autocompletion

### Supports

- Detection automatique des supports : AWACS, tankers (AAR), JTAC
- Position d'orbite des tankers/AWACS (coordonnees, altitude, vitesse)
- Position relative au bullseye (cap et distance)

### Menaces

- Detection et classification automatique des menaces ennemies :
  - SAM longue portee (SA-2, SA-5, SA-10/20, Patriot, NASAMS)
  - SAM moyenne portee (SA-3, SA-6, SA-11/17, HAWK, BUK)
  - SAM courte portee (SA-8, SA-9/13, SA-15, SA-18, Pantsir, Roland, Rapier)
  - AAA (ZSU-23, ZU-23, Gepard, Vulcan, Flak, C-RAM)
  - Navires (porte-avions, combattants de surface)
  - Menaces aeriennes (types d'appareils ennemis)

### Pages generees

#### Briefing mission (2 pages A4 + pages supplementaires)

- **Page 1** : nom de mission, date/heure, meteo, objectifs principaux et secondaires, execution, ROE, bullseye, zones de ravitaillement, menaces surface et air, tableau du package de vol, tableau des supports
- **Page 2** : zone libre pour notes, croquis ou image importee — bouton **＋ Page** pour ajouter des pages supplementaires

#### Datacards par flight (2 pages A4 par flight + pages supplementaires)

- **Page 1** : info vol (callsign, type, task, radios UHF/VHF), T/O Time, Push Time, TOT, tableau membres (callsign, TACAN, datalink, A/C n°), loadout (armement, fuel avec conversion kg/lbs/gal, joker/bingo), airbases T/O / ALT / DIV avec UHF, VHF, RWY, ILS, TACAN, objectifs tactiques, comm ladder UHF/VHF adaptatif (jusqu'a 20 presets, 12 colonnes)
- **Page 2** : tableau de steerpoints/waypoints (desc, task, coordonnees, cap, distance, vitesse/altitude, ETA cumulatif, TOS), zone carte/map avec import d'image — bouton **＋ Page** pour ajouter des pages supplementaires

#### Pages supplementaires (v1.0.2+)

- Ajoutables independamment pour le briefing et pour chaque datacard via **＋ Page**
- Regroupees en paires cote-a-cote (nombre pair) ou seule a gauche (nombre impair)
- Chaque page accepte texte libre et image
- Suppression individuelle via **− Page**
- Integrees aux exports PDF, JPG et HTML

### Edition WYSIWYG

- Tous les champs des pages sont editables directement sur l'apercu (contenteditable)
- Les valeurs saisies sont preservees lors de l'ajout/suppression de pages et de waypoints grace a des identifiants stables (`data-cell-id`) par champ
- Modification en temps reel sans rechargement
- Ajout/suppression de waypoints
- Recalcul automatique des ETA quand le T/O Time est modifie
- Conversion d'unites par groupe :
  - Distance : NM / km
  - Vitesse/altitude : kts/ft / km/h/m
  - Fuel : kg / lbs / gal
- Import d'images dans la zone briefing, la zone carte de chaque datacard et les pages supplementaires sans perte du texte saisi dans les autres zones

### Autocompletion des aerodromes

Base de donnees integree avec frequences (UHF, VHF), pistes, ILS, TACAN pour les theatres :
- Afghanistan, Caucasus, Germany Cold War, Kola
- Marianas, Nevada, Persian Gulf, Syria, Sinai, Falklands

Carriers detectes automatiquement avec frequence UHF (format XX.XX), TACAN et ICLS.

### Affichage adaptatif

- Mode **2 pages cote-a-cote** (defaut) ou **1 page**
- Scale automatique pour occuper la largeur disponible (volet gauche ouvert ou ferme), limite a 90% de la largeur ecran, avec un minimum d'une page A4
- Compatible tablette et grand ecran

### Export

- **PDF** : generation via html2canvas + jsPDF, toutes les pages en un fichier A4
- **JPG** : export page par page (`nom_PAGE_01.jpg`, `_PAGE_02.jpg`...)
- **HTML** : snapshot statique autonome partageable
- **Impression** : CSS `@media print` dedie (mise en page A4 exacte)
- **💾 Sauvegarder (.kbsave)** : sauvegarde complete et partageable de l'etat (voir section Sauvegarde)

---

## Sauvegarde et partage (.kbsave)

Le format `.kbsave` (JSON) permet de sauvegarder l'integralite de l'etat du kneeboard et de le rouvrir — ou de le partager avec un autre utilisateur — sans avoir besoin du fichier `.miz` original.

### Contenu du .kbsave

- Donnees structurelles de la mission (groupes, waypoints, frequences, carriers, menaces, meteo, bullseye)
- Formulaire complet (nom, objectifs, meteo, ROE, armement, etc.)
- Groupes selectionnes (PKG et supports)
- Waypoints et modifications, loadouts, preferences d'unites par groupe
- Listes de comms UHF/VHF
- Pages supplementaires (texte et images)
- Images insertees (briefing, cartes) en base64
- Contenu de toutes les cellules editables

### Flux d'utilisation

**Sauvegarder** : bouton **💾 Sauvegarder** dans la barre d'outils → telecharge `nom_mission.kbsave`

**Ouvrir** : bouton **📂 Ouvrir** ou drag & drop du `.kbsave` sur la zone de depot → reconstruit le kneeboard complet instantanement

---

## Dependances

Chargees depuis CDN (aucune installation requise) :
- [JSZip](https://stuk.github.io/jszip/) — decompression des fichiers .miz
- [html2canvas](https://html2canvas.hertzen.com/) — capture des pages pour export
- [jsPDF](https://github.com/parallax/jsPDF) — generation PDF

---

## Remerciements

Ce logiciel a été crée initialement pour l'escadrille les Irréductibles - www.lesirreductibles.com - avec l'aide de ses membres.
Equipe de Beta testeurs: IRRE_Haloraptor, IRRE_Ilios, IRRE_RollupTito, IRRE_YesNo-1010.
Mes remerciements particuliers à:
- IRRE_YesNo-1010 pour son aide sur certaines corrections de code, le paramétragre du repository et la mise en ligne.
- IRRE_RollupTito pour son aide poussée dans la recherche des bugs et propositions d'améliorations

---

## Historique des versions

### v1.0.5
- Ajout logo + lien les Irréductibles

### v1.0.4
- **Correction de securite**

### v1.0.3
- **Sauvegarde/chargement .kbsave** : format JSON autonome pour partager et reprendre un kneeboard sans le .miz original
- Boutons **💾 Sauvegarder** et **📂 Ouvrir** dans la barre d'outils
- La zone de drop accepte desormais les fichiers `.kbsave` en plus des `.miz`

### v1.0.2
- **Pages supplementaires** : ajout individuel de pages de notes libres (texte + image) pour le briefing et chaque datacard, avec regroupement en paires et suppression individuelle
- **Preservation des saisies** : les valeurs editees sont conservees lors de tout re-rendu grace a des `data-cell-id` semantiques sur chaque champ
- **Fix parser BTR-80** : guard `["units"]` dans les deux passes du parseur pour eliminer les faux positifs de categorisation (vehicules terrestres references dans des taches d'helicopteres)
- **Fix images** : injection directe des images sans re-rendu, preservant le texte des autres zones
- **Scale 90% max** avec minimum d'une page A4
- **NavTargetPoints** affiches uniformement comme des waypoints normaux

### v1.0.1
- Scale adaptatif : les pages occupent automatiquement toute la largeur disponible
- Fix format frequences UHF des carriers (2 decimales)
- Refonte du mecanisme de centrage des pages

### v1.0.0
- Version initiale : parseur .miz, briefing auto, datacards par groupe, exports PDF/JPG/HTML, comm ladder, base terrains, support DTC, integration carriers
