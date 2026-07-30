# Vinyle — platine virtuelle pour Windows

Application Electron : platine vinyle animée, bras de lecture interactif,
thèmes et textures personnalisables, synchronisée avec l'app **Apple Music**
officielle sur Windows.

Ce projet n'est **pas** une rétro-ingénierie de "MD Vinyle" (dont le code
n'est pas accessible) : c'est une implémentation originale du même concept.

## ⚠️ À lire avant d'installer — comment ça marche vraiment

1. **Le son n'est pas joué par cette app.** Le streaming Apple Music est
   protégé par FairPlay, un DRM qui n'est décodable que par le moteur
   WebKit de Safari. Electron (comme Chrome, Firefox, etc.) ne peut pas
   décoder ce flux. Cette app ne peut donc pas "être" un lecteur Apple
   Music autonome dans un navigateur/Electron.
2. **La solution retenue ici :** l'app Windows officielle *Apple Music*
   joue vraiment la musique en arrière-plan, et **Vinyle** la pilote et
   reflète son état (titre, artiste, pochette, position, play/pause,
   suivant/précédent) via l'ancienne interface d'automatisation COM
   héritée d'iTunes (`iTunesCOMInterface`), comme le ferait une
   télécommande.
3. **Condition indispensable :** cette interface COM n'existe que dans la
   version **classique** d'Apple Music pour Windows (l'installeur `.exe`
   téléchargé depuis
   [support.apple.com/fr-fr/HT210384](https://support.apple.com/fr-fr/HT210384)).
   La version distribuée sur le **Microsoft Store** est packagée en MSIX
   et n'expose pas cette interface — le pont ne trouvera rien avec elle.
4. Si Apple Music n'est pas détectable, l'app bascule automatiquement en
   **mode démo** (piste factice) pour que tu puisses quand même travailler
   sur les thèmes et l'animation sans avoir Apple Music ouvert.

## Prérequis

- Windows 10/11
- [Node.js](https://nodejs.org/) 18+
- Les **Build Tools Visual Studio** (composant "Desktop development with
  C++") — nécessaires pour compiler `winax`, le module qui parle au COM
  Windows. Sans ça, `npm install` échouera sur `winax`.
- L'app Apple Music (version classique, voir ci-dessus) installée et
  lancée au moins une fois.

## Installation

```bash
npm install
npm start
```

## Build en .exe distribuable

```bash
npm run dist
```

Le résultat est généré dans `dist/`. Tu peux remplacer `assets/icon.ico`
par ta propre icône avant de builder.

## Structure du projet

```
main.js              Processus principal Electron, sondage Apple Music
preload.js            Pont IPC sécurisé (contextBridge)
src/itunesBridge.js   Pont COM vers l'app Apple Music (iTunesCOMInterface)
index.html            Structure de l'interface
styles.css            Identité visuelle (noyer / cuivre), animations
renderer.js           Logique UI : bras interactif, thèmes, synchronisation
themes.json           Thèmes de vinyle prédéfinis
```

## Personnalisation

- Ajoute tes propres thèmes dans `themes.json` (couleur du vinyle, accent,
  couleur du label, texture `uni` / `artwork` / `custom`).
- Le sélecteur de couleur dans le panneau "🎨 Thème du vinyle" permet à
  l'utilisateur de composer sa propre teinte sans toucher au code.

## Pistes d'amélioration possibles

- Ajouter un vrai craquement de vinyle (Web Audio) au moment où le bras
  se pose, pour coller encore plus à la référence MD Vinyle.
- Widget "Toujours au premier plan" façon mini-lecteur.
- Détection automatique au démarrage : proposer d'ouvrir la page de
  téléchargement Apple Music classique si le pont COM échoue.
