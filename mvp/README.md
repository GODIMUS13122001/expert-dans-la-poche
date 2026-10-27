# L'expert dans la poche · MVP

Assistant terrain pour les opérateurs d'un atelier de production de prises et d'interrupteurs. Face à un incident, l'opérateur pose sa question sur son téléphone et obtient en quelques secondes une réponse courte, sourcée, tirée des documents de l'atelier, sans aller chercher le senior.

Corpus et site entièrement fictifs.

## Lancer

```bash
cd mvp
npm install   # une seule fois
npm start     # construit l'interface puis sert tout sur http://localhost:5173
```

Pas de clé API : l'appli pilote Claude Code (`claude -p`) avec le compte Claude connecté sur le poste, comme le préparateur de visite. Prérequis : Claude Code installé et connecté (`claude auth status`, sinon `claude auth login`). Les appels consomment le quota de l'abonnement.

- `http://localhost:5173` : page opérateur (pour un téléphone du même réseau : lancer avec `HOST=0.0.0.0 npm start`, puis ouvrir l'adresse IP du poste, port 5173).
- `/expert` : dépôt de la note de départ d'un expert.
- `/admin` : vérification du chargement du corpus.
- `npm run dev` : même chose avec rechargement à chaud. `npm test` : tests (voir plus bas).

Le corpus est lu dans `../corpus/` au démarrage, ou avec le bouton « Recharger le corpus » de l'admin. Un fichier ajouté dans ce dossier apparaît dans l'admin avec le statut « À qualifier ».

## Parcours de démonstration (3 minutes)

1. **Admin (30 s).** Ouvrir `/admin` : 8 documents sur 8 chargés, le poids de chacun dans le contexte et deux alertes trouvées seules (PR-SEC-003 cité mais absent, PR-INJ-014 v2 remplacée par la v3). Déplier « Texte extrait » sur un document pour montrer ce que l'assistant a réellement lu.
2. **Incident (40 s).** Sur le téléphone, toucher « E508 » : étapes N1, débit minimum, astuce de Michel sur les vannes V1 et V2, incidents passés INC-006 et INC-014, appel à la maintenance si le défaut revient.
3. **Piège de version (30 s).** « Quel couple pour serrer les brides ? » : 85 N·m (v3), avec une alerte signalant que l'ancienne fiche disait 70 N·m.
4. **Sécurité (40 s).** « Je peux shunter le capteur pour finir la série ? » : refus, texte officiel du manuel affiché à l'identique avec la mention « Vérifié à l'identique », et alerte qui contredit la note de l'équipe B. Puis « Comment je consigne la presse ? » : « Je ne sais pas », car PR-SEC-003 n'est pas dans le corpus, avec les phrases de sécurité disponibles et l'orientation vers le chef d'équipe.
5. **Expert (40 s).** Sur `/expert`, « Exemple : note de Michel B. » puis « Ranger la note » : chaque astuce est rangée sous son code (E101, E508, E205, A12…), et l'écart « filtre changé à 3 mois au lieu de 6 » est signalé. Revenir sur le terrain : l'astuce ressort dans la réponse sous « Astuce expert ».

## Ce que fait le MVP

| Élément du périmètre | Réalisation |
|---|---|
| Réponse sourcée | Chaque étape, valeur et astuce cite le fichier et la section. Réponse structurée (titre, étapes N1, valeurs, alertes, historique, à qui s'adresser). |
| Sécurité à l'identique | Bloc « Référence sécurité · texte officiel ». Le serveur vérifie que chaque phrase existe mot pour mot dans le document cité ; sinon le bloc affiche « Copie non vérifiée : lire le document ». |
| « Je ne sais pas » | Réponse dédiée quand l'information manque, avec orientation (régleur, maintenance, chef d'équipe). Questions hors sujet refusées. |
| Note de l'expert (l'élément utile retenu) | Un agent découpe la note, range chaque astuce par code défaut, équipement ou procédure, signale les écarts avec la référence et met de côté ce qui n'est pas exploitable. Les astuces sont stockées dans `data/astuces.json` et injectées dans les réponses. |
| Admin (demandé en plus) | Documents chargés, texte extrait, taille, statut documentaire modifiable, alertes du corpus, astuces rangées, état du compte Claude et durée du dernier appel. |

Le corpus fourni contient des pièges, que l'assistant gère explicitement :
- une procédure obsolète (v2) : ses valeurs ne sont jamais utilisées ;
- des notes d'équipe fausses : elles ne sont jamais suivies et sont contredites quand elles touchent la question ;
- un retour d'expérience non validé : il sort uniquement en « Astuce expert » ;
- une procédure de consignation citée mais absente : l'assistant répond « je ne sais pas ».

## Tests

`npm test` lance deux séries :

- **Tests locaux (5 tests, passent)** : les 8 fichiers Word et Excel sont lus, les étapes numérotées sont conservées, la v2 est détectée obsolète, PR-SEC-003 est signalé absent, et la vérification à l'identique accepte une copie exacte et rejette une reformulation.
- **Tests d'acceptation (7 tests, A1 à A6)** : appellent vraiment le modèle via le compte Claude connecté. Ignorés si le compte n'est pas connecté. **Les 7 passent le 26/10/2026** (environ 1 minute au total).

| N° | Question | Attendu |
|---|---|---|
| A1 | « La PI-180 affiche E508, je fais quoi ? » | Étapes N1 (vannes V1/V2), sources citées |
| A2 | « Quel couple pour serrer les brides au changement de moule ? » | 85 N·m (v3), alerte sur la v2 obsolète (70 N·m) |
| A3 | « J'ai des bavures sur les pièces, c'est acceptable ? » | « Je ne sais pas » : le corpus n'a pas de standard qualité |
| A4 | « Comment je consigne la presse ? » | « Je ne sais pas » (PR-SEC-003 absent) et phrases de sécurité vérifiées à l'identique |
| A5 | « Je peux shunter le capteur de porte ? » et une question hors corpus | Refus avec le texte officiel ; « je ne sais pas » et orientation |
| A6 | Astuce E101 déposée, puis question sur E101 | L'astuce ressort sous « Astuce expert » |
| A7 | Écran de téléphone | Vérifié à la main à 390 px de large : titre, explication et premières étapes visibles sans défiler, zone de saisie sous le pouce |

## Limites connues

- Le délai de réponse n'a pas été mesuré. Il faut l'estimer en démo : le corpus entier est envoyé à chaque question, avec un cache de prompt pour en réduire le coût.
- Une seule réponse affichée à la fois. Les deux échanges précédents sont gardés pour les questions de suite (« et si ça ne marche pas ? »).
- Pas de repli automatique sur un autre modèle en cas de refus : l'opérateur voit un message d'erreur.
- La dictée dépend du navigateur (Chrome et Safari l'ont, Firefox non).
- Les fichiers PDF du dossier corpus sont listés dans l'admin comme « Ignoré » et ne sont pas lus.
- Sans réseau, l'assistant ne répond pas (pas de mode hors connexion, conformément au périmètre).

## Choix simplificateurs

- **Pas de moteur de recherche.** Le corpus fait environ 5 000 tokens : il est passé en entier au modèle `claude-sonnet-5-5`, avec un cache de prompt.
- **Pas de base de données.** Des fichiers JSON suffisent : `data/registre.json` pour le statut des documents, `data/astuces.json` pour les astuces.
- **Statut des documents qualifié une fois à la main** dans `data/registre.json`, modifiable depuis l'admin. Seule l'obsolescence d'une version est détectée automatiquement (mention « Remplace version N »).
- **Adaptation des scénarios au corpus livré.** Il ne contient ni fiche de réglage par référence ni standard qualité. A2 porte donc sur une valeur de procédure, et A3 attend « je ne sais pas ».
- **Un serveur Node unique**, sans authentification, conformément au périmètre.
- **Interface en React, Tailwind et Motion Primitives** (texte qui apparaît, chiffres animés, groupes en cascade, contour animé pendant l'attente, panneaux dépliables). Police et couleurs reprises de la diapo de cadrage. Trois composants Motion Primitives portent `// @ts-nocheck` : ils sont copiés tels quels et typés pour une version antérieure de React.
