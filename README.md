# Pokedle

Pokedle is a browser-based Pokémon guessing game inspired by daily puzzle formats. Each day features a selection of Pokémon presented across multiple game modes — guess the right Pokémon using visual hints, progressive reveals, and comparison clues.

---

## Quick Start

- Install dependencies and run the dev server:

```powershell
npm install
npm run dev
```

- Open the app in your browser (Vite will show the local URL, typically `http://localhost:5173`).
- Play a daily puzzle — the game resets each day at 6:00 PM UTC.

---

## Modes & Rules

Pokedle includes several modes. Each mode has its own daily answer and a small set of rules:

- Classic
  - Goal: Guess the Pokémon using textual comparison hints (height, weight, types, habitat, evolution stage, etc.).
  - Rules: Submit names; the game compares attributes and shows match/partial/miss feedback for each field.

- Card
  - Goal: Identify a Pokémon from a trading-card-style image that is progressively revealed.
  - Rules: The card image starts blurred or cropped and progressively reveals as you guess. Some days use special card variants.

- Pokedex
  - Goal: Guess the Pokémon using Pokedex-styled clues (flavor text, categories, or similar).
  - Rules: Submit names; feedback is provided similar to Classic mode.

- Silhouette
  - Goal: Identify the Pokémon from a silhouette image that zooms out to reveal more detail with each wrong guess.
  - Rules: Each incorrect guess reduces zoom (revealing more of the silhouette) and the focal point gradually relaxes toward the center as guesses increase.

- Zoom
  - Goal: Recognize the Pokémon from a small zoomed-in portion of its artwork.
  - Rules: The visible region expands with each incorrect guess.

- Colours
  - Goal: Guess a Pokémon by colour hints and small sprite clues.
  - Rules: Colour blocks and sprite hints are gradually revealed across guesses.

- Game Data / Results
  - `Game Data` shows metadata and extra information used by the puzzles.
  - `Results` provides a daily summary showing which modes were solved and the number of guesses used.

Notes
- Each mode has its own daily answer; solving one mode does not automatically solve others.
- Guesses are persisted locally (per browser) and reset on the daily seed.

---

## UX & Gameplay Details

- Images on the site are intentionally protected from accidental drag and right-click (to reduce accidental downloads or opening in new tabs).
- Celebrations (congrats message, emoji, confetti) are tuned for timing and consistency; guess counts are emphasized.
- Silhouette and zoom behaviors are tuned to keep revealing useful details as you make guesses.

---

## Developer Notes

- Source pages live in `src/pages/` (e.g. `SilhouettePage.jsx`, `ZoomPage.jsx`, `CardPage.jsx`, `ClassicPage.jsx`, `ColoursPage.jsx`).
- Shared components are in `src/components/` (e.g. `CongratsMessage.jsx`, `Header.jsx`).
- Static data is loaded from `public/data/` at runtime (e.g. `pokemon_data.json`, `silhouette_meta.json`, `zoom_meta.json`, `card_manifest.json`).
- Asset URLs reference `https://raw.githubusercontent.com/Pythagean/pokedle_assets/...` for sprites, images and silhouettes.

Contributing
- Feel free to open issues or PRs. Follow the existing style and use the deterministic seeding helpers (see `getSeedFromDate` and `mulberry32`) when adding daily-selection logic.

License
- This project contains third-party Pokémon artwork and assets; check `public/` and `scripts/` for asset provenance. Add your preferred license text here if you plan to distribute the repository.

