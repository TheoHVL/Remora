# Roadmap : Remora

> **Remora** : s'accroche à n'importe quel ordinateur, où qu'il soit, pour l'aider à distance.
> Développement : du 24 novembre au 18 décembre 2026, soit environ 4 semaines
> Auteur : [TheoHVL](https://github.com/TheoHVL)

---

## 1. Objectif

Créer une application de prise en main à distance (dans l'esprit d'AnyDesk ou TeamViewer) **utilisable par Internet**, pour :

- les équipes de support informatique : aider des employés **et des clients externes** ;
- n'importe qui souhaitant auto-héberger sa propre solution de prise en main à distance.

Contraintes :

- **budget nul** : hébergement, domaine et certificats gratuits ;
- trois OS : **Windows, macOS, Linux** ;
- code **propre, testé, documenté**, avec un historique Git lisible ;
- **comprendre** chaque brique, pas seulement la faire fonctionner.

---

## 2. Choix techniques

| Domaine                    | Choix                                  | Pourquoi                                                 |
| -------------------------- | -------------------------------------- | -------------------------------------------------------- |
| Langage                    | **TypeScript 6** partout               | Typage, autocomplétion, apprécié en entreprise           |
| Organisation du code       | **Monorepo** (npm workspaces)          | Client, serveur et types partagés dans un seul repo      |
| Appli de bureau            | **Electron** + electron-vite           | Multi-OS, WebRTC intégré, l'écosystème JS qu'on connaît  |
| Vidéo + données temps réel | **WebRTC**                             | Vidéo compressée, chiffrement DTLS, passage du NAT (ICE) |
| Souris / clavier           | **nut.js** (`@nut-tree-fork/nut-js`)   | Simulation des entrées sur les 3 OS                      |
| Serveur                    | **Node.js + Fastify + ws**             | API REST (comptes) + WebSocket (signalisation)           |
| Base de données            | **SQLite** (better-sqlite3)            | Un simple fichier, gratuit, suffisant pour ce projet     |
| Validation des messages    | **zod**                                | On ne fait jamais confiance à ce qui arrive du réseau    |
| Mots de passe              | **argon2id**                           | Algorithme de hachage recommandé (OWASP)                 |
| Authentification           | **JWT** courts + refresh token         | Standard, sans état côté serveur                         |
| Relais réseau              | **coturn** (STUN + TURN)               | Indispensable par Internet                               |
| HTTPS / WSS                | **Caddy** + Let's Encrypt              | Certificats gratuits et automatiques                     |
| Déploiement serveur        | **Docker Compose**                     | Serveur, coturn et Caddy lancés en une commande          |
| Tests                      | **Vitest**                             | Rapide, natif TypeScript                                 |
| Qualité                    | ESLint + Prettier + **GitHub Actions** | CI à chaque push / PR                                    |
| Installateurs              | **electron-builder**                   | `.exe`, `.dmg`, `.AppImage` / `.deb`                     |

### Hébergement gratuit (à vérifier : les offres changent souvent)

- **GitHub Student Developer Pack**, gratuit avec une adresse e-mail étudiante. Il donne en général des crédits cloud (DigitalOcean, Azure for Students…) et un nom de domaine offert pendant un an. C'est la piste n° 1.
- **Oracle Cloud Always Free** : VM gratuite sans limite de durée, mais une carte bancaire est demandée pour vérification (aucun débit).
- **Domaine** : celui du Student Pack, ou un sous-domaine gratuit type **DuckDNS**.
- En production : n'importe quel serveur Linux avec Docker (auto-hébergement).

> ⚠️ Un serveur TURN a besoin de ports **UDP**. Les hébergeurs « PaaS » gratuits (Render, etc.) ne conviennent donc pas : il faut une **vraie VM**.

---

## 3. Architecture cible

```
                         ┌──────────────── VPS (Docker Compose) ────────────────┐
                         │  Caddy (HTTPS/WSS)                                    │
                         │     └─► Serveur Node.js : API REST + signalisation    │
                         │            └─► SQLite (comptes, postes, journaux)     │
                         │  coturn (STUN/TURN, UDP 3478 + plage de relais)       │
                         └───────────────────────────────────────────────────────┘
                               ▲  wss://  (ID, mise en relation, SDP/ICE)  ▲
                               │                                           │
   Poste TECHNICIEN ───────────┘                                           └────────── Poste CLIENT
   (connecté à son compte)        ◄═══════ WebRTC chiffré (DTLS-SRTP) ══════►    (aucun compte requis)
                                   vidéo · souris/clavier · presse-papiers
                                   fichiers · chat  (direct, ou via TURN)
```

```
remora/
├── apps/
│   ├── desktop/        # Electron (main, preload, renderer)
│   └── server/         # API + signalisation
├── packages/
│   └── shared/         # Types et schémas zod du protocole (partagés)
├── deploy/             # docker-compose.yml, Caddyfile, turnserver.conf
├── docs/               # Architecture, protocole, sécurité, captures
└── .github/workflows/  # CI
```

### Rôles

- **Client** (la personne aidée) : télécharge l'appli, communique son ID et son mot de passe, accepte la demande. Pas de compte nécessaire.
- **Technicien** : doit être **connecté à un compte** pour lancer une prise en main. C'est la sécurité principale pour une appli exposée sur Internet.
- **Admin** : crée les comptes techniciens et consulte le journal des sessions.

---

## 4. Planning par phases

Légende des priorités : 🟥 **indispensable** · 🟧 **important** · 🟨 **bonus si le temps le permet**

### Phase 0 : Fondations (24 → 27 nov.)

Objectif : un repo propre, prêt à accueillir le code.

- 🟥 Créer le repo, `README`, `.gitignore`, licence MIT
- 🟥 Monorepo npm workspaces : `apps/desktop`, `apps/server`, `packages/shared`
- 🟥 TypeScript (`tsconfig` de base partagé), ESLint, Prettier
- 🟥 Vitest + un premier test
- 🟥 CI GitHub Actions : lint + typecheck + tests à chaque push et PR
- 🟧 GitHub Projects : un ticket (issue) par tâche de cette roadmap, un _milestone_ par phase
- 🟧 Ouvrir son compte GitHub Student Pack et réserver la VM

**À comprendre :** les workspaces npm, à quoi sert un `tsconfig`, ce que fait une CI, une convention de commits.

---

### Phase 1 : Cœur de la prise en main (30 nov. → 4 déc.)

Objectif : refaire le prototype proprement, en TypeScript, étape par étape.

- 🟥 `shared` : définir le **protocole** (types + schémas zod pour chaque message)
- 🟥 Serveur de signalisation : ID, mise en relation, relais SDP/ICE, limite de tentatives + tests
- 🟥 Electron : structure main / preload / renderer, `contextIsolation`, CSP
- 🟥 Capture d'écran + flux vidéo WebRTC
- 🟥 Canal de données : souris (coordonnées normalisées) et clavier (`KeyboardEvent.code`)
- 🟥 Sécurité de base : mot de passe aléatoire vérifié par l'hôte, **fenêtre de consentement**, **bandeau** de session, relâcher les touches en fin de session
- 🟧 Gestion des erreurs et reconnexion automatique au serveur
- 🟧 Écran d'accueil propre (UI)

**Livrable :** une démo en local, deux fenêtres sur un même PC ou deux PC du même réseau.
**À comprendre :** WebSocket vs HTTP, SDP / offer / answer, candidats ICE, `RTCDataChannel`, IPC Electron, pourquoi le preload existe.

---

### Phase 2 : Passage sur Internet (7 → 9 déc.)

Objectif : faire fonctionner l'appli entre deux réseaux différents (ex : Wi-Fi + partage 4G).

- 🟥 VM : sécurisation de base (SSH par clé, pare-feu `ufw`, mises à jour automatiques)
- 🟥 Domaine + **Caddy** → `wss://` avec certificat Let's Encrypt
- 🟥 **coturn** avec **identifiants TURN temporaires** (générés par le serveur, valables quelques minutes, jamais écrits dans l'appli)
- 🟥 Docker Compose pour tout lancer
- 🟥 Configuration de l'appli (URL du serveur) sans valeur codée en dur
- 🟧 Indicateur de qualité dans l'appli : connexion directe ou relayée, ping, images/s
- 🟨 Déploiement automatique du serveur depuis GitHub Actions

**Livrable :** prise en main fonctionnelle entre deux réseaux différents.
**À comprendre :** NAT, STUN vs TURN, pourquoi certaines connexions doivent être relayées, TLS et certificats, reverse proxy.

---

### Phase 3 : Comptes et identité des postes (9 → 11 déc.)

Objectif : passer d'un jouet à un outil qu'on peut exposer sur Internet.

- 🟥 Base SQLite : tables `users`, `devices`, `sessions_log`
- 🟥 API : connexion technicien (argon2id + JWT), création de comptes par un admin
- 🟥 Seul un **technicien connecté** peut lancer une demande de connexion
- 🟥 **ID permanent** pour chaque poste. Au premier lancement, le poste génère une paire de clés (Ed25519) et le serveur lui attribue un ID. Aux connexions suivantes, le poste prouve son identité en signant un défi.
- 🟥 **Journal des sessions** : qui, quel poste, début, fin, durée
- 🟧 Page admin simple : liste des techniciens et des sessions
- 🟨 Double authentification (TOTP) pour les techniciens

**À comprendre :** hachage vs chiffrement, sel, JWT (contenu, signature, expiration), signature asymétrique et défi/réponse, injections SQL et requêtes préparées.

---

### Phase 4 : Fonctionnalités de confort (14 → 16 déc.)

- 🟧 **Multi-écrans** : liste des écrans, changement à chaud (`replaceTrack`), bonnes coordonnées souris
- 🟧 **Presse-papiers partagé** (texte), activable ou désactivable pendant la session
- 🟧 **Transfert de fichiers** : découpage en morceaux, contrôle du débit (`bufferedAmount`), barre de progression, **confirmation côté receveur**, taille maximale
- 🟧 **Chat** texte pendant la session
- 🟨 Ctrl+Alt+Suppr / raccourcis spéciaux, réglage de qualité vidéo

**À comprendre :** _backpressure_, découpage de fichiers, encodage binaire vs JSON, coordonnées multi-écrans et facteur d'échelle (écrans HiDPI).

---

### Phase 5 : Accès sans surveillance (16 → 17 déc.) ⚠️ sensible

Objectif : se connecter à un poste sans que personne ne clique sur « Accepter » (serveurs, PC le soir).

- 🟧 Option **désactivée par défaut**, activable seulement sur le poste lui-même
- 🟧 Mot de passe d'accès dédié et robuste, stocké **haché** (argon2id) sur le poste
- 🟧 Réservé aux techniciens connectés, éventuellement à une liste de techniciens autorisés
- 🟧 Le bandeau de session reste **toujours visible**, et chaque accès est journalisé
- 🟨 Lancement automatique au démarrage du système

**À comprendre :** modèle de menace (qui peut attaquer, comment), principe du moindre privilège.

---

### Phase 6 : Finitions, livraison, présentation (17 → 18 déc.)

- 🟥 Installateurs Windows / macOS / Linux (electron-builder), construits par la CI sur les 3 OS
- 🟥 Documentation : `README` (installation, usage), `docs/architecture.md`, `docs/protocole.md`, `docs/securite.md`
- 🟥 Captures d'écran / GIF de démo
- 🟥 Démo + guide de déploiement et de maintenance (`docs/deploiement.md`)
- 🟧 Tag de version `v1.0.0` + _release_ GitHub avec les installateurs

> Note : les installateurs **non signés** affichent un avertissement (SmartScreen sous Windows, Gatekeeper sous macOS). Les certificats de signature sont payants : on documente ce point plutôt que de l'acheter.

---

## 5. Méthode de travail

### Pour chaque tâche

1. **Explication** : on voit le concept et pourquoi on en a besoin.
2. **Écriture** : tu écris le plus possible. Je t'aide, je relis, je corrige.
3. **Vérification** : tests + démo manuelle.
4. **Questions de compréhension** : tu dois pouvoir expliquer le code à l'oral.
5. **Commit / PR**.

### Git

- Branche `main` toujours fonctionnelle. Une branche par tâche : `feat/signaling-server`, `fix/key-release`…
- Une **Pull Request** par tâche, avec la CI verte avant de fusionner.
- Convention de commits : `[TYPE] : explication`
  - `[INIT] : project setup` : initialisation
  - `[ADD] : signaling server` : nouvelle fonctionnalité ou nouveau fichier
  - `[UPDATE] : rate limiting on connect requests` : amélioration de l'existant
  - `[FIX] : release pressed keys when session ends` : correction de bug
  - `[DEL] : remove unused prototype files` : suppression
  - `[REFACTO] : split renderer into modules` : réorganisation sans changer le comportement
  - `[DOC] : explain NAT traversal` : documentation
  - `[TEST] : protocol schemas` : tests
  - `[CONF] : eslint and prettier` : configuration et outillage
- Petits commits fréquents, chacun avec **une seule intention**.

### Définition de « terminé » pour une tâche

- [ ] Le code compile, le lint et les tests passent (CI verte)
- [ ] La fonctionnalité a été testée à la main
- [ ] La doc est à jour si besoin
- [ ] Je sais expliquer chaque ligne

---

## 6. Risques identifiés

| Risque                                                                                      | Impact                          | Parade                                                             |
| ------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------ |
| Planning serré (4 semaines, 6 phases)                                                       | Fonctions inachevées            | Priorités 🟥 d'abord, les 🟨 sautent en premier                    |
| Wayland (Linux) bloque la capture et la simulation des entrées                              | Linux limité                    | Cibler X11, documenter la limite                                   |
| Permissions macOS (Accessibilité, Enregistrement de l'écran)                                | Appli « muette » sur Mac        | Écran d'aide qui guide l'utilisateur                               |
| Écrans UAC / appli lancée en admin (Windows)                                                | Impossible de cliquer dessus    | Documenter. Un service Windows est hors périmètre.                 |
| TypeScript 7 pas encore supporté par typescript-eslint                                      | Outils de qualité inutilisables | Rester sur TypeScript 6 et migrer quand l'écosystème suivra        |
| Offre d'hébergement gratuit indisponible                                                    | Pas de démo par Internet        | Prévoir deux pistes (Student Pack, Oracle) dès la phase 0          |
| Appli exposée sur Internet = cible d'attaques                                               | Sécurité                        | Comptes obligatoires, limites de tentatives, consentement, journal |
| Le serveur de signalisation pourrait remplacer les clés WebRTC (attaque de l'intermédiaire) | Confidentialité                 | 🟨 Afficher un code de vérification identique sur les deux postes  |

---

## 7. Décisions et questions ouvertes

- [x] Nom de l'application : **Remora**
- [x] Licence : **MIT**, repo public
- [x] TypeScript 6 plutôt que 7 (compatibilité avec typescript-eslint)
- [ ] Hébergement de l'instance de démonstration (GitHub Student Pack ou Oracle Cloud)
- [ ] RGPD : le journal des sessions contient des données personnelles. Il faut informer les utilisateurs et définir une durée de conservation.

---

## 8. Suivi

| Phase                      | Statut                     |
| -------------------------- | -------------------------- |
| Prototype JS (exploration) | ✅ fait, sert de référence |
| 0 · Fondations             | 🔄 en cours                |
| 1 · Cœur                   | ⏳                         |
| 2 · Internet               | ⏳                         |
| 3 · Comptes                | ⏳                         |
| 4 · Confort                | ⏳                         |
| 5 · Sans surveillance      | ⏳                         |
| 6 · Livraison              | ⏳                         |
