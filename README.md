# L'expert dans la poche

<img src="icone.png" alt="" width="96" align="right">

Un assistant de terrain pour les opérateurs d'un atelier de production. Face à un incident, l'opérateur pose sa question sur son téléphone et reçoit en quelques secondes une réponse courte et sourcée, tirée des documents de l'atelier, sans attendre le technicien senior.

Le point difficile n'était pas de répondre, mais de **ne pas répondre faux** quand les documents se contredisent. Le corpus de test contient des pièges, et l'assistant les gère :

- une procédure obsolète (v2, remplacée par la v3) dont les valeurs ne sont jamais utilisées ;
- des notes d'équipe fausses, contredites quand elles touchent la question ;
- un retour d'expérience non validé, qui sort uniquement comme « Astuce expert » ;
- une procédure de sécurité citée mais absente : l'assistant répond « je ne sais pas » et oriente vers le chef d'équipe.

Les consignes de sécurité ne sont jamais reformulées : le serveur vérifie que chaque phrase affichée existe mot pour mot dans le document cité.

## Contenu

| Dossier | Contenu |
|---|---|
| [`mvp/`](mvp/README.md) | L'application : serveur Express, interface React (pages opérateur, expert, admin), tests |
| [`corpus/`](corpus/) | 8 documents **fictifs** (manuel, procédures v2/v3, notes d'équipe, historique d'incidents, planning) pour une presse à injecter fictive, la PI-180 de « Plastelec » |
| [`consignes-claude-code-mvp-expert-dans-la-poche.md`](consignes-claude-code-mvp-expert-dans-la-poche.md) | Les consignes données à Claude Code pour construire le MVP : périmètre, règles de comportement, scénarios d'acceptation |

## Lancer

Prérequis : Node.js et [Claude Code](https://docs.claude.com/en/docs/claude-code) installé et connecté (`claude auth login`). Aucune clé API : l'application pilote `claude -p` avec le compte connecté, chaque question consomme donc le quota de l'abonnement.

```bash
cd mvp
npm install
npm start      # http://localhost:5173  (admin : /admin, expert : /expert)
npm test       # 5 tests locaux + 7 tests d'acceptation qui appellent vraiment le modèle
```

Le serveur n'a pas d'authentification : il n'écoute donc que sur la machine elle-même. Pour une démo sur téléphone, lancer `HOST=0.0.0.0 npm start`, puis ouvrir l'adresse IP du poste, port 5173, et seulement sur un réseau de confiance.

Les polices Fraunces et Geist sont sous licence SIL Open Font License (`mvp/public/fonts/OFL-*.txt`).

Parcours de démo, détail des tests et limites connues : [`mvp/README.md`](mvp/README.md).
