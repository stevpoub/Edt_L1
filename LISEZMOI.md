# Planning LBM1 – S1 (application Android)

## Ce que c'est
Une application web installable ("PWA") qui reprend l'emploi du temps de l'onglet **LBM1‑S1** du fichier Excel : navigation semaine par semaine, vue jour par jour, code couleur par matière (Bio, Chimie, Maths, Stats, Modélisation, Info), et rappels.

## Installer sur Android (comme une vraie appli)
1. Héberge le dossier quelque part accessible en HTTPS (le plus simple : glisser le dossier dans **Netlify Drop** (netlify.com/drop), ou **GitHub Pages**, ou Google Drive + un service d'hébergement statique). Un simple double‑clic sur `index.html` en local fonctionne pour consulter le planning mais Android n'autorisera pas l'installation ni les notifications sans HTTPS.
2. Ouvre l'adresse dans **Chrome** sur le téléphone.
3. Menu ⋮ → **Ajouter à l'écran d'accueil** (ou la bannière d'installation apparaît automatiquement).
4. L'icône "Planning LBM1" apparaît alors comme une appli normale, en plein écran, avec son propre icône.

## Les rappels / notifications — à savoir
Le bouton **"Activer les rappels"** dans l'appli :
- envoie une notification résumant les cours du jour **à chaque ouverture de l'appli** ;
- tente d'utiliser l'API expérimentale *Periodic Background Sync* de Chrome/Android pour une vérification automatique une fois par jour, **mais** cette fonctionnalité n'est disponible que sur Chrome Android, pour une appli déjà installée et utilisée régulièrement — Google ne garantit pas l'heure exacte du déclenchement, et ce n'est pas supporté sur iPhone.

**Une vraie alerte "jour par jour" garantie, à heure fixe, sans dépendre du navigateur**, nécessite un serveur d'envoi de notifications (push), ce qu'une appli 100 % statique comme celle-ci ne peut pas faire seule.

### Solution fiable incluse : le fichier `.ics`
Le fichier **`planning-LBM1-S1.ics`** contient les 203 séances avec une alarme automatique **15 minutes avant chaque cours**. Pour l'utiliser :
1. Ouvre ce fichier sur ton téléphone (ou importe-le dans Google Agenda / Google Calendar : Paramètres → Importer).
2. Toutes les séances s'ajoutent à ton agenda avec des rappels natifs Android, jour par jour, de façon garantie — c'est le calendrier du téléphone qui gère l'alerte, pas le navigateur.

Tu peux utiliser les deux en parallèle : l'appli pour consulter joliment le planning semaine par semaine, et l'agenda pour les alertes fiables.

## Modifier les données
Toutes les séances sont dans `data.js` (généré depuis le fichier Excel). Si le planning change, il faut regénérer ce fichier depuis le nouveau fichier Excel.
