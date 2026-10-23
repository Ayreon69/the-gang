# The Gang — version web

Version web multijoueur de **The Gang**, le poker coopératif : chaque joueur
prend un jeton de 1 à N selon la force qu'il pense avoir, à chaque étape
(pré-flop, flop, turn, river). Si l'ordre des jetons rouges correspond au vrai
classement des mains, le casse est réussi. Trois casses réussis = victoire,
trois alarmes = défaite.

## Lancer le jeu

Il faut [Node.js](https://nodejs.org) 18 ou plus récent.

```bash
npm install
npm start
```

Le jeu tourne sur <http://localhost:3000>. Au démarrage, le terminal affiche
aussi l'adresse à donner aux amis connectés **au même Wi-Fi**
(du type `http://192.168.1.20:3000`).

Pour jouer avec des amis qui sont ailleurs, il faut héberger le serveur en
ligne (Render, Railway, Fly.io…) : c'est une application Node classique qui
écoute sur la variable d'environnement `PORT`, avec `npm start` comme commande
de démarrage. L'hébergeur doit accepter les WebSockets.

## Comment ça marche

1. Un joueur crée un salon et partage le code à 4 lettres (ou le lien).
2. Les autres rejoignent avec ce code. De 2 à 6 joueurs (3 à 6 conseillés).
3. L'hôte lance la partie.
4. À chaque étape, on clique sur un jeton pour le prendre : au centre, ou
   directement devant un autre joueur pour le lui prendre. Cliquer sur son
   propre jeton le repose au centre.
5. Quand tout le monde a un jeton, chacun valide. Le moindre mouvement de
   jeton annule les validations.
6. Après la river, l'abattage révèle les mains dans l'ordre des jetons rouges.

Recharger la page ou perdre la connexion n'éjecte pas le joueur : il retrouve
sa place automatiquement. L'option « Aide » du salon affiche à chacun le nom
de sa combinaison, pratique pour débuter.

## Tester seul

Des robots peuvent rejoindre un salon pour remplir la table :

```bash
npm run bots -- ABCD 3
```

(`ABCD` = code du salon, `3` = nombre de robots.)

## Structure

- `server.js` : serveur Express + Socket.io, gestion des salons.
- `lib/game.js` : règles de The Gang (jetons, étapes, abattage, score).
- `lib/hands.js` : évaluation des mains de poker.
- `public/` : l'interface (HTML, CSS, JavaScript sans framework).
- `test/` : `npm test` vérifie l'évaluation des mains et le déroulé d'un casse.
