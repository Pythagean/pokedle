## Release Notes — February 13, 2026

## What’s New

- **Locations Mode** <br>
    - Added % Chance and Pokemon Levels to locations mode
- **Card Mode** <br>
    - Added cards from Ascended Heroes, Fantastical Parade
    - Very slight tweak to intial blur level
    - Removed shiny cards from pool

## Commits included (newest first)

```text
27fa617 | 2026-02-13 | Locations: Adding % chance and Levels to locations mode
764b0ae | 2026-02-13 | pokemon_data tidy up and removal of unused fields
475589a | 2026-02-13 | Locations: Adding Level Range and Chance % to locations in pokemon_data.json
22f4ab9 | 2026-02-13 | Slight reduction in initial blur level
13453ec | 2026-02-13 | Card: Slight reduction in initial blur level
59c9fc4 | 2026-02-11 | Removed shiny card logic, Saturdays are always full art
e95d82a | 2026-02-06 | More results images
7457e9e | 2026-02-05 | Adding new results images
0635e81 | 2026-02-05 | Adding cards from Ascended Heroes
a9083f2 | 2026-02-05 | Added Fantastical Parade Cards
4e99921 | 2026-02-04 | Adding more results images
df3fac0 | 2026-02-04 | Fixing Marowak location
b2c352e | 2026-02-04 | Adding more results images
06229ae | 2026-01-31 | Fixed issue with Azurill - added text saying pokemon can only be bred
36be954 | 2026-01-30 | Added perfect category for result images
bdb4f77 | 2026-01-30 | Fixing Mount moon location
0c7738f | 2026-01-30 | Changing results thresholds, adding more images
```

## Release Notes — January 21, 2026

## What’s New

- **Locations Mode** <br>
    - Fixes around how maps are picked (mainly around pre-evolutions and different future logic)
    - Added Map Popup feature - Clicking on the map will display a screenshot from the game (this doesn't contain the exact place the Pokemon is found, it's intended to be memory refresher)
- **Results Page** <br>
    - Added more images for results card and tweaked thresholds for each type

## Commits included (newest first)

```text
f02f69e | 2026-01-21 | Added more images for results card and tweaked thresholds for each type
ea897c3 | 2026-01-21 | Locations: Added map popup feature
8a330c6 | 2026-01-21 | Card: Very slight tweak to initial blur level
f92eb43 | 2026-01-21 | Fixing locations mode for Pokemon that can't be found in their generation, but can be found in future gens
5cdcac9 | 2026-01-19 | Update PATCH_NOTES.md to format new features and fix display issues in Locations Mode
1109cb6 | 2026-01-19 | Update PATCH_NOTES.md to include recent commits and enhancements
```

## Release Notes — January 19, 2026

## What’s New

- **Classic Mode**<br>
    - Added arrows to congrats message for Height/Weight
- **Silhouette Mode**<br>
    - Made this mode a bit easier by decreasing the intital zoom-in value. And the image zooms out a bit more with each guess
- **Locations Mode** <br>
    - Removed "Rock Smash" when only showing Gen 1 locations. <br>
    - Fixed issue with Ruins of Alph map not displaying<br>
    - Display header and text even if there are no extra locations to show beyond Pokemon's generation

## Commits included (newest first)

```text
5b59e88 | 2026-01-19 | Only show shiny sprites in GuessInput on card page (if it's Shiny Saturday)
ce178f4 | 2026-01-19 | Locations: Display header and text even if there are no extra locations to show beyond Pokemon's generation
dd90215 | 2026-01-19 | Removed debug mode from Locations
4d5d27e | 2026-01-19 | Locations: Removed "Rock Smash" when only showing Gen 1 locations
81dbf34 | 2026-01-19 | Classic: Added arrows to congrats message for Height/Weight
eac2e87 | 2026-01-19 | Silhouette: Made this mode a bit easier by decreasing the intital zoom-in value. And the image zooms out a bit more with each guess
c39252c | 2025-12-21 | Pokemon location tidy up, ensure mobile shows 2 maps per row
```

## Release Notes — December 20, 2025

## What’s New

- **Card Mode** - Re-classified some cards from Full Art to Special Illustration. Removed some regional variant cards
- **Locations Mode** - Re-worded messaging around when a Pokemon can't be found in the wild to make it more obvious
- **Results Page** - Tweak logic around results message appearing on card

## Commits included (newest first)

```text
174f87a | 2025-12-20 | Increase bottom margin in ResultsPage for improved layout
7305851 | 2025-12-20 | Adjust blur levels in CardPage based on guess count for improved visual feedback
effbb92 | 2025-12-20 | Update release notes for December 20, 2025
03496f6 | 2025-12-20 | Comment out unused button and div elements in LocationsPage for cleaner code
fe276c9 | 2025-12-20 | Update LocationsPage to display pre-evolution location message and clean up unused code
c3c047a | 2025-12-20 | Re-classified some cards from Full Art to Special Illustration. Removed some regional variant cards
1ae75a7 | 2025-12-20 | Tweak logic around results message appearing on card
6572466 | 2025-12-19 | Add extract_pokemon_fields script to process and filter Pokemon data from JSON
7336689 | 2025-12-18 | Adding some overrides
5b9d081 | 2025-12-18 | Update PATCH_NOTES.md for December 18, 2025 release
```

## Release Notes — December 18, 2025

## What’s New

- **Classic Mode** - Added sprites, type styling and habitat images
- **Card Mode** - Added latest TCG Pocket expansion (Crimson Blaze) to card list
- **Colours Mode** - Fixed some bugs around the hints and hint placeholders
- **Locations Mode** - Updated tooltip to contain all known encounter methods

## Commits included (newest first)

```text
535cc91 | 2025-12-18 | Classic - added sprites to Generation/Stage boxes, added type styling to Types, added habitat images to Habitats
9b2e22a | 2025-12-18 | Adding sprites to generation hints
cc373c4 | 2025-12-18 | Zoom Page - use combined transition approach to fix zoom out bug
2873b38 | 2025-12-18 | Colours Page: fixed bugs around hints and hint placeholders
13f3dac | 2025-12-18 | Locations Page: A few tweaks to pokemon locations, updating tooltip
5c55e91 | 2025-12-18 | Adding Crimson Blaze cards
```

## Release Notes — December 17, 2025

## What’s New

- **Locations Mode** - Re-working Locations Mode to include game names in the clues, tweaked logic behind hints to provide extra clues
- **Results Mode** - Truncate name textfield to prevent overflow on generated card image, added message down bottom based on score
- **Pokedex Mode** - 2nd hint is now the Pokemon Genus, before moving onto the other pokedex entries
- **Colours Mode** - Added a pixelated mosaic as the first hint given, to help certain people who aren't very good at this mode

## Commits included (newest first)

```text
c6d93c7 | 2025-12-17 | Update PATCH_NOTES.md for December 17, 2025 release, adding new features and commits
4459f39 | 2025-12-17 | Added message down bottom of generated results card
dc6c25b | 2025-12-17 | Colours Page: Added colour mosaic hint
d3993b5 | 2025-12-17 | Added new colour scripts for making mosaics
5f59c9a | 2025-12-17 | Xmas period setup
0e4db69 | 2025-12-17 | Fix: Update Pokedex Mode hints and correct title capitalization
b80e4fe | 2025-12-17 | Pokedex Page: 2nd hint is now the Pokemon Genus, before moving onto the other pokedex entries
34e539b | 2025-12-17 | Override dark mode preference on name field
8b6b43c | 2025-12-17 | Limit card name input and processing to 12 characters for improved performance and consistency
60fa6aa | 2025-12-17 | Re-working Locations Mode to include games in the clues, tweaked logic behind hints to provide extra clues and make the mode easier for certain people
00dead4 | 2025-12-17 | Location data update
6c0e3bc | 2025-12-15 | Added more results card backgrounds and fixed dark mode on name textfield
e1d37ae | 2025-12-15 | Fix file path for loading location to file map in LocationsPage
8b47732 | 2025-12-15 | Update PATCH_NOTES.md for December 15, 2025 release, highlighting new features and improvements
```

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
