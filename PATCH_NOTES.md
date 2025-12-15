## Release Notes — December 15, 2025

## Overview

Major version release - Combined Silhoutte/Zoom mode into Details mode (and added Eyes Mode). Replaced Game Info Mode with Locations Mode. Results card generation

## What’s New

- **Eyes Mode** - Added new Eyes Mode, guess the pokemon based on their eyes!
- **Details Mode** - Added a new 'Details Mode' which will alternate between Zoom and Silhouette Modes (with Eyes mode on Friday)
- **Card Mode** - Slightly reduced blur level for Full Art and Illustration cards
- **Colours Mode** - Hints given are now the Pokemon's Types, and then the Generation (after 3 then 6 guess respectively). Re-generated Colour blocks with different parameters
- **Locations Mode** - Added new Locations Mode (replacing Game Info), shows the maps where the Pokemon is found straight away
- **Results Page** - Allow user to generate a TCG Card with their results on it, and generate a Guesses Image with all of their guesses in it. Changed 'Last 7 Days' section to use Pokedle numbers instead of weekdays

## Commits included (newest first)

```text
8136236 | Add image preloading and visibility handling for Eyes and Zoom pages
8a4c993 | Add TYPE_COLORS for consistent Pokémon type styling across pages
37e2611 | Changing Location Page hints to give the user the pokemon type
deb9ede | Refine blur levels based on guess count for improved visual feedback
e4a4980 | Re-generated colour blocks with different parameters. Changes what clues are given for the user in Colours Mode
7e97274 | Script tidy up
844c56a | Added Eyes mode
c50423e | Adjust zoom parameters and update headings for Silhouette and Zoom pages
bcd4b06 | Clean up old localStorage entries on app mount
5eda4f4 | Update Last 7 Days section to use Pokedle numbers instead of weekday labels
9dc40ee | Update card manifest
3dc3098 | Setting up card override feature, rebuilding card manifest
4410382 | Added Details Mode, tweaks to Results Page image generation
61989f6 | Replaced Game Info page with Locations
c6ca4a8 | Pokemon Data setup for GameData > Map Mode transformation
4d6d399 | Results card tweaks
c71e3cc | Guess image in results page
308089c | Results Page - Initial commit for results card generation
b3af82c | Game Data - Added effect descriptions to Held Items
13f4383 | Update PATCH_NOTES.md for December 8, 2025
```


## Release Notes — December 8, 2025

## Overview

Small maintenance and debugging polish focused on the Zoom and Silhouette modes, plus a number of developer-facing fixes to make debug overlays more helpful while diagnosing centering issues.

## What’s New

- **Silhouette Page** - Reworked the translate logic to use the new center-based approach
- **Zoom Page** - Reworked the translate logic to use the new center-based approach
- **Card Page** - Fixed issue where full art example image wasn't showing
- **Results Page** - Fixed issue where Game Data score wasn't displaying in 'Last 7 Days' section
- **Game Data** - Trim effects text to remove fullstop
- **All Pages** - Removed restriction on number of pokemon displayed in GuessInput box

## Commits included (newest first)

```text
26295d2 | Zoom Page / Silhouette Page - complete rework of how image positioning is done
1425d59 | #99 - Remove restriction on number of pokemon displayed in GuessInput box
77424b9 | #101 - Game Data - trim effects text to remove fullstop
20906f6 | #100 Card Page - fixed issue where full art example image wasn't showing
bf4487f | #102 Results Page - fixed issue where Game Data score wasn't displaying in 'Last 7 Days' section
```


## Release Notes — December 5, 2025

## Overview

Small but focused polish across Game Data, UI, and repository metadata. Game Info received clarity and readability improvements (font sizing and ability descriptions), clue selection rules were tightened so less-useful clues are not shown first, and a few location tidy-ups were applied to the data set.

## What’s New

- **Game Data** — Abilities now include short effect descriptions so the Abilities clue is more informative.
- **Game Data** — The first clue will never be `shape` or `Base Stats`; `locations` and `held_items` are now prevented from being chosen first when their arrays are empty.
- **Game Data** — Location tidy-ups (removed incorrect/obsolete entries such as the burned tower mapping for some Kanto Pokémon).

## Commits included (newest first)

```text
0c31aa4 | Location tidy ups - removed burned tower from kanto pokemon
7a89c74 | Game Data - Shape & Base Stats clues can't be the first clues shown to the user. Locations and held items can't be first if they are blank
94df9d3 | Update font sizes in GameInfoPage for better readability and adjust ResultsPage mode label
def2b19 | Game Data - Added effect descriptions to abilities clue
c4c9e20 | Fix formatting in PATCH_NOTES.md for consistency and clarity
6e53ebe | Update overview in PATCH_NOTES.md to reflect gameplay and tooling improvements, including Gen-3 level-up moves and UX fixes.
7a57a15 | Refactor PATCH_NOTES.md to remove redundant "(user-facing)" label from "What’s New" sections
bcb7c00 | Updated patch notes
```


## Release Notes — December 3, 2025

## Overview

Polished gameplay and tooling: Game Info now shows grouped Gen‑3 level‑up moves; Results and Zoom received UX fixes to prevent accidental swipes and avoid uniform zoom points; Shiny Saturday odds were lowered to 10% and Full‑Art/Illustration cards have slightly reduced blur.

## What’s New

- **Game Info Page** - Moves learnt are now pulled from Gen 3, they are also now grouped and displayed by level (eg. "Lvl 1 - Vine Whip, Tackle").
- **Results Page** - Fixed issue where scrolling in 'Last 7 Days' section causes page swipe to trigger
- **Zoom Page** - Zoom Page should now only select zoom-in point if it contains more than one colour
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
