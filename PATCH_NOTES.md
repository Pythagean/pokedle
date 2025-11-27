````markdown
# Release Notes — November 27, 2025

## Overview

- Today's update adds a clickable map viewer for Game Info, tightens up zoom/silhouette behavior (including better debug visuals), and adds tooling to fetch and match Bulbapedia map images so clues can link to actual maps.

## What’s New (user-facing)

- **Game Info: Clickable Location Maps** — Location names in Game Info are now links that open a popup showing the corresponding map image (when available) from the assets repo.
- **Zoom Mode: Centered Focal Point & Improved Debug Overlay** — The chosen zoom focus centers reliably (hopefully), mirroring is handled correctly
- **Silhouette: Smoother Reveal Behavior** — Transform-origin behavior now holds for early guesses and then eases toward the center over subsequent guesses to produce more intuitive reveals.
- **Map Tooling (developer)** — New scripts to download Bulbapedia maps, generate a todo/overrides file for unmapped locations, and fuzzy-match existing map files to in-game location names. The downloader skips existing files by default and records missing/failed items for easy follow-up.

## Commits included (newest first)

```
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

## What’s New (user-facing)

- **Improved Card Reveal** — Reduced initial blur and tuned progressive reveal so card hints feel more informative and consistent as you guess.
- **Smoother Silhouette Zooming** — The silhouette zoom focuses more intuitively as you guess: the focal area stays useful earlier and drifts toward center later in the guess sequence, producing less confusing reveals.
- **No More Image Drags** — Images (silhouette, zoom, colour hints, card images) can no longer be dragged or opened in a new tab by accident.
- **Clearer Celebration Message** — The congrats message now emphasizes your guess count for a more satisfying win display.
- **Better Confetti Timing** — Confetti triggers are timed to the visible congrats message to reduce jarring or mistimed celebrations.
- **Celebration Text** — Fixed day/number calculations and added per-user persistent emoji and prefix choices for consistent celebrations.
- **Game Reset Time** — Game reset time standardized to **6:00 PM UTC** (equivalent local times: 5:00 AM AET/Melbourne, 7:00 AM NZT, 7:00 PM GMT).
- **Colours Mode Tweaks** — Changed grouping threshold for colour mode and re-generated images

## Commits included (newest first)

```
e70c759 | Adjust height and weight scaling factors in ClassicPage; update match/partial/miss styles
c713d0e | Refactor image scaling logic in SilhouettePage: adjust transform-origin based on guess count
29974ad | #75 - Prevent image dragging and context menu on multiple pages: set draggable to false and add event handlers
4f56284 | Enhance CongratsMessage: emphasize guess count by wrapping it in strong tags for better visibility
9dec562 | #76 - Fix epoch definition in CongratsMessage: set first day to 2025-11-24 for accurate day number calculation
fc6d1bc | #72 - Refactor emoji selection and phrase generation in CongratsMessage: implement persistent storage for user-specific celebrations
c9ca6eb | #70 - Refactor blur level logic in CardPage: adjust values for improved visual feedback based on guesses
ca912ea | #69 - Enhance confetti display logic: manage pending state and trigger based on CongratsMessage visibility
```

````

