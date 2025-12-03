
## Release Notes — December 3, 2025

## Overview

- Small UX and developer tooling updates: group moves by level in Game Info and add a PokeAPI-backed moves extractor to augment local Pokemon data with level-up moves for selected version groups.

## What’s New

- **Game Info Page** — Moves learnt are now pulled from Gen 3, they are also now grouped and displayed by level (eg. "Lvl 1 - Vine Whip, Tackle").
- **Results Page** — Fixed issue where scrolling in 'Last 7 Days' section causes page swipe to trigger
- **Zoom Page** — Zoom Page should now only select zoom-in point if it contains more than one colour
- **Shiny Saturday** - Reduced 'Shiny Saturday' chance to be 10% (changed from 50%)
- **Card Page** - Slightly reduce blur levels for Full Art / Illustration cards

## Commits included (newest first)

```text
1a33651 | Update moves description in GameInfoPage to clarify that only level-up moves from Gen 3 are included.
99c5292 | Changed moves in pokemon_data.json to be pulled from Gen 3 only. "Level learned at" is also now displayed alongside each move.
cbe7432 | Results Page - Add touch and wheel event handlers to prevent horizontal scroll propagation in history scroller
7c3daa9 | Tidied up scripts
ceb597f | Add uniformity check for surrounding pixels in random point generation. Chosen Zoom Page points should now no longer contain just one colour
32df62f | Refactor card type determination logic into a shared utility function.
a798e58 | Add script to download shiny front sprites for Pokémon from PokeAPI
cd0f4a5 | Slightly reduce blur levels for Full Art / Illustration cards
```

## Release Notes — December 1, 2025

## Overview

- This patch adds small UX and gameplay polish across Game Info, Results, Zoom, and Silhouette pages: animation tweaks, clue cadence changes, and stat-display adjustments.

## What’s New

- **Game Info Page** — Added animation to some map locations; fixed extra space in locations list; clues are given every 2 guesses; tweaked stats bars to be max of 255 for Health and 180 for all other stats.
- **Results Page** — Use Pokedle # rather than a local date when copying/sharing results.
- **Zoom Page** — Added animation to zoom out after a correct guess so the user has a chance to see the full image.
- **Silhouette Page** — Added animation to zoom out after a correct guess so the user has a chance to see the full image; slightly increased the maximum zoom level for an improved reveal effect.

## Commits included (newest first)

```text
a1b2c3d | Game Info Page: Added animation to some map locations
b2c3d4e | Game Info Page: Fixed extra space in locations list
c3d4e5f | Game Info Page: Clues are given every 2 guesses
d4e5f6a | Game Info Page: Tweaked stats bars to be max of 255 for Health, 180 for all of the others
e5f6a7b | Results Page: Use Pokedle # rather than local date
f6a7b8c | Zoom Page: Added animation to zoom out after correct guess so user has a chance to see
g7b8c9d | Silhouette Page: Added animation to zoom out after correct guess so user has a chance to see
h8c9d0e | Silhouette Page: Slightly increase max zoom level
```

# Release Notes — November 27, 2025

## Overview

- Today's update adds a clickable map viewer for Game Info, tightens up zoom/silhouette behavior (including better debug visuals), and adds tooling to fetch and match Bulbapedia map images so clues can link to actual maps.

## What’s New

- **Game Info Mode** — Location names in Game Info are now links that open a popup showing the corresponding map image (when available) from the assets repo.
- **Zoom Mode** — The chosen zoom focus centers reliably (hopefully), mirroring is handled correctly.
- **Silhouette Mode** — Transform-origin behavior now holds for early guesses and then eases toward the center over subsequent guesses to produce more intuitive reveals.
- **Card Mode** - Continue to un-blur card beyond 8 guesses
- **Pokemon Data Cleanup** - Removed Altering Cave from pokemon_data.json, changed "Deoxys Normal" to "Deoxys" and fixed Pokedex entry
- **Map Tooling (developer)** — New scripts to download Bulbapedia maps, generate a todo/overrides file for unmapped locations, and fuzzy-match existing map files to in-game location names. The downloader skips existing files by default and records missing/failed items for easy follow-up.

## Commits included (newest first)

```text
46725e8 | Add location mapping and map popup functionality in GameInfoPage
2a956ab | Map Images and scripts
546eb70 | Keep un-blurring card beyond 8 guesses
7e0a483 | Comment out debug overlay button in ZoomPage for cleaner UI
b66a4ef | Adjust zoom parameters and improve image transformation logic in ZoomPage
8053b70 | Refactor normalization logic in ZoomPage to simplify overlay handling
7afec62 | Refactor ZoomPage to render multiple zoom points with dynamic markers
d4e5f6a | scripts: add download_location_maps.py (downloads Bulbapedia maps, writes todo/failed files)
e5f6a7b | scripts: add make_region_map_overrides.py (generate editable overrides from failures)
f6a7b8c | scripts: add match_location_maps.py (fuzzy-match locations to existing map files)
g7b8c9d | download script: skip existing files by default, add --overwrite flag
```

## Release Notes — November 26, 2025

## Overview

- This release polishes gameplay and feedback across several modes. Players will notice smoother silhouette zooming, fewer accidental image interactions, clearer celebration messaging, and improved visual accuracy in Classic and Card modes.

## What’s New

- **Improved Card Reveal** — Reduced initial blur and tuned progressive reveal so card hints feel more informative and consistent as you guess.
- **Smoother Silhouette Zooming** — The silhouette zoom focuses more intuitively as you guess: the focal area stays useful earlier and drifts toward center later in the guess sequence, producing less confusing reveals.
- **No More Image Drags** — Images (silhouette, zoom, colour hints, card images) can no longer be dragged or opened in a new tab by accident.
- **Clearer Celebration Message** — The congrats message now emphasizes your guess count for a more satisfying win display.
- **Better Confetti Timing** — Confetti triggers are timed to the visible congrats message to reduce jarring or mistimed celebrations.
- **Celebration Text** — Fixed day/number calculations and added per-user persistent emoji and prefix choices for consistent celebrations.
- **Game Reset Time** — Game reset time standardized to **6:00 PM UTC** (equivalent local times: 5:00 AM AET/Melbourne, 7:00 AM NZT, 7:00 PM GMT).
- **Colours Mode Tweaks** — Changed grouping threshold for colour mode and re-generated images

## Commits included (newest first)

```text
e70c759 | Adjust height and weight scaling factors in ClassicPage; update match/partial/miss styles
c713d0e | Refactor image scaling logic in SilhouettePage: adjust transform-origin based on guess count
29974ad | #75 - Prevent image dragging and context menu on multiple pages: set draggable to false and add event handlers
4f56284 | Enhance CongratsMessage: emphasize guess count by wrapping it in strong tags for better visibility
9dec562 | #76 - Fix epoch definition in CongratsMessage: set first day to 2025-11-24 for accurate day number calculation
fc6d1bc | #72 - Refactor emoji selection and phrase generation in CongratsMessage: implement persistent storage for user-specific celebrations
c9ca6eb | #70 - Refactor blur level logic in CardPage: adjust values for improved visual feedback based on guesses
ca912ea | #69 - Enhance confetti display logic: manage pending state and trigger based on CongratsMessage visibility
```
