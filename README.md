# DCS Kneeboard Generator

Generateur de kneeboards (fiches de vol) pour **DCS World**. Application web 100% front-end, sans serveur : ouvrir le fichier HTML dans un navigateur suffit.

## Fonctionnalites

### Import et parsing de missions

- Import de fichiers `.miz` (format mission DCS — archive ZIP contenant du Lua)
- Parsing automatique des donnees de mission :
  - Theatre, date, heure de depart, lever/coucher de soleil
  - Meteo : vent (sol, 2000ft, 8000ft), temperature, QNH, visibilite, nuages
  - Bullseye par coalition (blue / red)
- Detection des coalitions (bleue, rouge, neutre) avec filtre

### Groupes aeriens

- Detection automatique des groupes aeriens (avions et helicopteres)
- Extraction par groupe :
  - Callsign, type d'appareil, task/role
  - Frequences radio UHF et VHF (jusqu'a 20 presets par radio)
  - Canal TACAN
  - Membres avec callsign individuel, numero d'appareil (onboard_num), datalink (STN L16)
  - Waypoints avec coordonnees, cap, distance, altitude, vitesse, ETA cumulatif
  - Armement (pylones CLSID), fuel, chaff, flare, gun
  - Aerodrome de depart (avec autocompletion)
- Filtre Players / Clients (detection via le champ `skill`)

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

#### Briefing mission (2 pages A4)
- Page 1 : nom de mission, date/heure, meteo, objectifs principaux et secondaires, execution, ROE, bullseye, zones de ravitaillement, menaces surface et air, tableau du package de vol, tableau des supports
- Page 2 : zone libre pour notes, croquis, ou image importee

#### Datacards par flight (2 pages A4 par flight)
- Page 1 : info vol (callsign, type, task, radios), tableau membres (callsign, TACAN, datalink, A/C n°), loadout (armement, fuel avec conversion kg/lbs/gal, joker/bingo), airbases (T/O, ALT, DIV avec autocompletion), objectifs tactiques, comm ladder UHF/VHF adaptatif (jusqu'a 20 presets)
- Page 2 : tableau de steerpoints/waypoints (desc, task, coordonnees, cap, distance, vitesse/altitude, ETA cumulatif, TOS), zone carte/map avec import d'image

### Edition WYSIWYG

- Tous les champs des pages sont editables directement sur l'apercu
- Modification en temps reel sans rechargement
- Ajout/suppression de waypoints
- Recalcul automatique des ETA quand le T/O Time est modifie
- Conversion d'unites par groupe :
  - Distance : NM / km
  - Vitesse/altitude : kts/ft / km/h/m
  - Fuel : kg / lbs / gal

### Autocompletion des aerodromes

Base de donnees integree avec frequences (UHF, VHF), pistes, ILS, TACAN pour les theatres :
- Afghanistan, Caucasus, Germany Cold War, Kola
- Marianas, Nevada, Persian Gulf, Syria, Sinai, Falklands

### Export

- **PDF** : generation via html2canvas + jsPDF (haute resolution)
- **JPG** : export page par page
- **HTML** : snapshot statique autonome
- **Impression** : CSS `@media print` dedie (mise en page A4 exacte)

## Structure du projet

```
dcs_kneeboard.html   Application principale (CSS + HTML + JS)
miz_parser.js        Parseur de fichiers mission DCS (.miz / Lua)
dcs_airfields.js     Base de donnees des aerodromes DCS
mission.miz          Fichier mission de test
```

## Dependances

Chargees depuis CDN (aucune installation requise) :
- [JSZip](https://stuk.github.io/jszip/) — decompression des fichiers .miz
- [html2canvas](https://html2canvas.hertzen.com/) — capture des pages pour export
- [jsPDF](https://github.com/parallax/jsPDF) — generation PDF

## Utilisation

1. Ouvrir `dcs_kneeboard.html` dans un navigateur
2. Glisser ou selectionner un fichier `.miz`
3. Choisir la coalition et selectionner les flights
4. Editer les champs directement sur l'apercu
5. Exporter en PDF, JPG, HTML ou imprimer
