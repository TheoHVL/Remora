# 🐟 Remora

> Remora s'accroche à n'importe quel ordinateur, où qu'il soit, pour l'aider à distance.

Remora est une application de **prise en main à distance** multiplateforme (Windows, macOS, Linux) : un technicien voit l'écran d'un poste distant et le contrôle à la souris et au clavier, de façon **sécurisée** et **par Internet**.

> 🚧 **Projet en cours de développement** : voir la [roadmap](ROADMAP.md).

## Fonctionnalités prévues

- Partage d'écran et contrôle à distance (souris, clavier)
- Connexion par ID et mot de passe, avec **accord explicite** de la personne aidée
- Fonctionne par Internet (WebRTC + relais TURN)
- Comptes techniciens et journal des sessions
- Multi-écrans, presse-papiers partagé, transfert de fichiers, chat
- Accès sans surveillance (optionnel)

## Stack technique

| Partie                | Technologies                                      |
| --------------------- | ------------------------------------------------- |
| Application de bureau | Electron, TypeScript, WebRTC, nut.js              |
| Serveur               | Node.js, TypeScript, Fastify, WebSocket, SQLite   |
| Infrastructure        | Docker Compose, Caddy (HTTPS), coturn (STUN/TURN) |
| Qualité               | Vitest, ESLint, Prettier, GitHub Actions          |

## Licence

[MIT](LICENSE)
