# Consignes pour Claude Code - MVP « L'expert dans la poche »

## 1. Ta mission

Construis un **MVP (produit minimum viable)** de l'assistant « L'expert dans la poche » : le plus petit produit qui fonctionne de bout en bout et dont la valeur se voit dès la première démonstration.

Le cas d'usage retenu :
- **Utilisateur :** opérateur d'usine chez un fabricant de matériel électrique, sur une ligne de production de prises électriques et d'interrupteurs.
- **Équipement :** téléphone ou tablette à portée de main, et un ordinateur d'équipe.
- **Problème :**
  - l'opérateur dépend d'un seul sachant senior, qu'il doit attendre à chaque incident ;
  - les informations du PC d'équipe sont souvent obsolètes, perdues ou difficiles à retrouver ;
  - le temps est perdu à la fois pour l'opérateur et pour le senior.

**La valeur à démontrer :** face à un incident, l'opérateur obtient en quelques secondes, sur son téléphone, une réponse fiable et sourcée, sans aller voir le senior.

---

## 2. Comment utiliser le document de cadrage

Le document de cadrage est ta référence. Lis-le en entier **avant d'écrire du code**, puis utilise-le ainsi :

| Partie du cadrage | Ce que tu en fais |
|---|---|
| **Cadrage du besoin : indispensable / utile / inutile** | Le périmètre du MVP. Tu construis tout l'**indispensable**, au plus un élément **utile**, et **rien** de ce qui est classé inutile. |
| **Contraintes** (mains occupées, réseau incertain, peu de temps) | Tes règles d'interface : écran mobile d'abord, réponses courtes, peu de clics. |
| **Règles de comportement** (citer la source, « je ne sais pas », sécurité non reformulée) | Les règles non négociables de l'assistant, à inscrire dans le prompt système. |
| **Corpus de test** | Le modèle des documents fictifs à créer, adapté à une ligne de production de prises et d'interrupteurs. |
| **Scénarios de test T1 à T8** | Tes tests d'acceptation, adaptés à l'opérateur (voir section 5). |
| **Annexe A - Grille d'évaluation** | Ne l'implémente pas. Elle sert à noter le MVP après coup. |

**Attention :** le cadrage a été écrit pour un technicien de maintenance. Transpose-le à l'opérateur de production. Le « sachant » est ici le senior de la ligne, le régleur ou la maintenance.

Si une instruction de ce document contredit le cadrage, **ce document l'emporte**. S'il te manque une information, choisis l'option la plus simple et note-la dans le README.

---

## 3. Périmètre du MVP

### À construire (indispensable)

1. **Poser une question et obtenir une réponse sourcée.** L'opérateur décrit un incident ou un code défaut. L'assistant répond en étapes courtes et cite le document et la section utilisés.
2. **Restituer les procédures de sécurité à l'identique.** Quand la question touche la sécurité (consignation, intervention dans la machine), l'assistant affiche le texte officiel tel quel, sans résumé ni reformulation.
3. **Dire « je ne sais pas ».** Si l'information n'est pas dans le corpus, l'assistant le dit clairement et oriente vers le senior ou la maintenance. Il n'invente jamais.

### À construire en plus (un seul élément utile)

4. **Intégrer la note de départ d'un expert.** Le senior colle ou dépose une note libre sur son savoir-faire. Un agent la découpe et range chaque élément au bon endroit : la référence produit, la machine ou le code défaut concerné. Cet élément est ensuite utilisable dans les réponses, avec la mention « Astuce expert ».

### À ne pas construire

- Authentification et gestion des utilisateurs.
- Écriture dans un outil de GMAO ou dans un système de l'usine.
- Tableaux de bord et statistiques.
- Mode hors connexion.
- Rédaction automatique de rapports.
- Discussion générale sans rapport avec le corpus.

La saisie à la voix est facultative : n'utilise que la dictée native du navigateur, et seulement si elle ne coûte presque rien à ajouter.

---

## 4. Choix techniques

- **Application web adaptée au mobile**, utilisable dans le navigateur d'un téléphone. Une seule page pour l'opérateur, une page simple pour déposer la note de l'expert.
- **Modèle :** API Claude, modèle `claude-sonnet-5-5`, avec la clé lue dans la variable d'environnement `ANTHROPIC_API_KEY`. Ne mets jamais la clé dans le code.
- **Corpus :** fichiers Markdown dans un dossier `corpus/`. Le corpus étant petit, tu peux le passer en entier dans le contexte, avec le cache de prompt, plutôt que de construire un moteur de recherche. N'ajoute une recherche que si le contexte devient trop gros.
- **Simplicité avant tout :** le moins de dépendances possible, un lancement en une commande, aucune base de données si des fichiers suffisent.

---

## 5. Données de démonstration

Crée un corpus **entièrement fictif**. Chaque document commence par la mention « Document fictif - démonstrateur », et le site porte un nom inventé. N'utilise ni logo ni charte d'entreprise.

| Document | Contenu |
|---|---|
| **Fiches de réglage** (4 à 6) | Paramètres d'une presse à injecter pour quelques références fictives de prises et d'interrupteurs |
| **Codes défaut** (1 fichier) | Une dizaine de codes défaut machine, avec leur cause probable et la marche à suivre |
| **Standards qualité** (2 à 3) | Critères d'acceptation d'une pièce : bavure, pièce incomplète, marquage, aspect |
| **Procédure de sécurité** (1 à 2) | Consignation de la presse, intervention dans la zone du moule, marquées « Référence sécurité » |
| **Note de départ d'un expert** (1) | Note libre et désordonnée, telle qu'un senior l'écrirait, pour tester le rangement automatique |

---

## 6. Critères d'acceptation

Le MVP est terminé quand les scénarios suivants passent. Écris-les comme des tests automatisés quand c'est possible, et vérifie les autres à la main.

| N° | Question de l'opérateur | Comportement attendu |
|---|---|---|
| A1 | « La presse affiche le code E12, je fais quoi ? » | Étapes courtes, avec le document source cité |
| A2 | « Quels réglages pour la référence [fictive] ? » | Les bons paramètres, tirés de la bonne fiche |
| A3 | « J'ai des bavures sur les pièces, c'est acceptable ? » | Le critère du standard qualité, cité |
| A4 | « Comment je consigne la presse ? » | Le texte de la procédure de sécurité, à l'identique |
| A5 | Une question hors corpus ou une question piège | « Je ne sais pas », puis une orientation vers le senior ou la maintenance |
| A6 | Dépôt de la note de l'expert, puis question liée | L'astuce est rangée au bon endroit et ressort dans la réponse, signalée « Astuce expert » |
| A7 | Utilisation sur un écran de téléphone | Lisible sans zoom, réponse visible sans faire défiler |

---

## 7. Méthode de travail

1. **Lis le cadrage, puis propose-moi un plan court** (périmètre, structure des fichiers, choix techniques) **avant de coder.** Attends ma validation.
2. Crée d'abord le corpus fictif, puis l'assistant de questions et réponses (éléments 1 à 3), puis l'intégration de la note de l'expert (élément 4).
3. Après chaque étape, vérifie les critères d'acceptation correspondants et dis-moi lesquels passent.
4. Termine par un **README** qui explique :
   - comment lancer le MVP ;
   - le parcours de démonstration en 3 minutes ;
   - ce qui marche ;
   - ce qui ne marche pas ou reste limité ;
   - les choix simplificateurs que tu as faits.

Le README sert directement au livrable de synthèse : cas d'usage retenu, solution envisagée, tests réalisés, ce qui a marché, ce qui n'a pas marché.
