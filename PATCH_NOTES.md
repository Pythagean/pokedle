## Release Notes — May 31st, 2026

## What’s New

- **Overall** <br>
    - Site is live on slowpokle.com
- **Colours** <br>
    - Style and layout tweaks
    - Show sprite image next to sprite colours image after correct guess
- **Results** <br>
    - Make it obvious who the current player is on leaderboard and guess breakdown
    - Only show top 20 players on leaderboard and guess breakdown
- **Locations** <br>
    - Fix Kanto Power Plant map not showing

## Commits included (newest first)

```text
f279897 | 2026-05-31 | Colours: Style and layout tweaks
e74f10f | 2026-05-31 | Updating to slowpokle.com
8593e24 | 2026-05-30 | Update homepage URL and add CNAME file for custom domain
4769d84 | 2026-05-30 | Configure base path to always use root for Vite
793d2dd | 2026-05-30 | Adding CNAME file for pokedle.fortmaximus.com
9b7b38b | 2026-05-30 | Change supabase edge function limit to only return 20 results for leaderboard (rather than 50)
b213c31 | 2026-05-30 | Results: Make it obvious who the current player is on leaderboard and guess breakdown
a904844 | 2026-05-30 | Colours: Show sprite image next to sprite colours image after correct guess
225c7f3 | 2026-05-30 | Locations: Fix Kanto Power Plant map not showing
de199e4 | 2026-05-29 | Adding some daily overrides
070b10f | 2026-05-29 | Patch notes May 29th
```

## Release Notes — May 29th, 2026

## What’s New

- **Colours** <br>
    - Add random extra initial hint which is chosen at random each day
- **Card** <br>
    - Added Chaos Rising and Paradox Drive cards to pool

## Commits included (newest first)

```text
93978dc | 2026-05-29 | Adding more backgrounds options to results cards
9edfd3a | 2026-05-29 | Colours: Added extra initial clues which can be chosen randomly each day
d4d82ef | 2026-05-29 | Colours: Slight tweak to type clue wording
7eb234e | 2026-05-29 | New Cards: Paradox Drive
1379b90 | 2026-05-28 | New Cards: Chaos Rising
bfd0d0c | 2026-05-27 | Colours: Add random extra initial hint
d1ad232 | 2026-05-23 | Refactor yesterday date calculation to derive from game-day seed for accurate previous-day seed
```

## Release Notes — May 22nd, 2026

## What’s New

- **Overall** <br>
    - Changed name from Pokedle to Slowpokle
    - Changed colour scheme of header to better suit new name / logo
    - Rewrote some hint placeholders so they are consistent across all modes
    - Added hamburger button to header containing the following items
- **Yesterday's Slowpokle (WIP)** <br>
    - New feature allowing users to play yesterday's puzzles
    - Probably still needs some work, especially around the results
- **Pokegrid** <br>
    - Link to another app to view a grid of pokemon
- **Patch Notes** <br>
    - Page showing any changes to the game
- **Donate** <br>
    - Link to Ko-fi page
- **About** <br>
    - About page describing the game
- **Location** <br>
    - Fixed Kanto Route 2 map 

## Commits included (newest first)

```text
18758dc | 2026-05-22 | Header styling
ae473cb | 2026-05-21 | WIP: Pink buttons
6c5ab41 | 2026-05-21 | Adding Slowpoke icon and styling the header
b4a58f6 | 2026-05-20 | Refactor code structure for improved readability and maintainability
844414a | 2026-05-20 | Implement yesterday mode result submission and update leaderboard display
8147de0 | 2026-05-20 | Toggle yesterday mode in header button for improved user experience
ff69450 | 2026-05-20 | Add date prop to page components for yesterday's mode support
0da9724 | 2026-05-20 | Initial commit of 'Yesterday's Pokedle' feature
75775ca | 2026-05-20 | Remove debug mode
de49fd9 | 2026-05-20 | Locations: Fixed Kanto Route 2 map, commented console debug lines
34dda76 | 2026-05-20 | Make hint placeholders consistent across game modes
2a5f9c9 | 2026-05-20 | Enhance AboutPage and Header components: add setPage prop and improve button styling
27a49e5 | 2026-05-20 | Locations: Scale up Footprint image slightly
9f0022b | 2026-05-15 | 'About page' changes
6bd2cd8 | 2026-05-15 | Adding About page, Privacy Policy and a link to the Pokegrid app
042282c | 2026-05-15 | Adding hamburger menu to nav bar, containing a new in-app Patch Notes page
```

## Release Notes — May 15th, 2026

## What’s New

- **Results** <br>
    - Added Guess Breakdown feature
- **Locations** <br>
    - Bug fixes around map loading
    - Changing some data, fixing incorrect locations, adding Firered/Leafgreen locations to Gen II Pokemon data
- **Card** <br>
    - Saturdays and Sundays are both now Illustration days. Weekdays have a 5% chance of being shiny cards, 5% chance of being Full Art cards
    - After you have clicked 'show blurred' you can click each previous guess box to see how blurry the card was when you guessed that pokemon
    - Added new cards from sets: Pulsing Aura, Ninja Spinner
- **Details** <br>
    - Added 'Features' sub-mode
    - User can now click on previous guesses to return the zoom level to previous steps.
    - Added some hints in Silhouette mode (Generation after 5 guesses, Pokemon types after 7 guesses)

## Commits included (newest first)

```text
dfd7253 | 2026-05-15 | Reverted accidental commit
f26a764 | 2026-05-15 | Silhouette: Add hints for generation and types in SilhouettePage; update thresholds and zoom behavior
1d66ae8 | 2026-05-14 | Update SilhouettePage.jsx
31a7fbd | 2026-05-13 | Saturdays and Sundays are both now Illustration days. Weekdays have a 5% chance of being shiny cards, 5% chance of being Full Art cards
ea7aa42 | 2026-05-11 | Updating card manifest
0851c5a | 2026-05-10 | Building up Shiny Cards
ec4ea38 | 2026-05-09 | Adding Firered/Leafgreen locations to Gen 2 Pokemon
bca64bc | 2026-05-08 | Details: User can now click on previous guesses to return the zoom level to previous steps.
9fe6e94 | 2026-05-08 | Details: Added Features sub-mode
c338cca | 2026-05-08 | Building Body Part manifest
28a6a21 | 2026-05-01 | Locations; Adding some Sevii Islands locations
3ac46ca | 2026-05-01 | Card: After you have clicked 'show blurred' you can click each previous guess box to see how blurry the card was when you guessed that pokemon
98a6e8d | 2026-04-29 | Added Metang and Claydol special illustration cards from Japenese set Ninja Spinner
1cf4455 | 2026-04-29 | Fix: Update map URL handling to prevent 404 errors by using null until confirmed filename is available
728289f | 2026-04-29 | Fixing syntax error in Results Page
5504823 | 2026-04-29 | New Cards: Pulsing Aura
d94baa4 | 2026-04-29 | ResultsPage: Refactor display of guesses and player information for improved layout
f286b12 | 2026-04-29 | Some script work
f2005e8 | 2026-04-29 | Fixing aron shape
a5f232e | 2026-04-24 | Results: Created Guess Breakdown section
7aeb391 | 2026-04-24 | Results: Hiding Group Results
e77d485 | 2026-04-24 | ResultsPage: Add medal display for leader and group results based on totals
5a7f614 | 2026-04-24 | ResultsPage: Add preview type state and adjust canvas size calculations for card and guesses
6bbb311 | 2026-04-24 | ResultsPage: Enhance title display with player name and adjust spacing
53f101f | 2026-04-22 | Removing Galarian Slowking card from pool
f14fe9a | 2026-04-20 | ResultsPage: Add display for guesses count and names in results
eaf5b06 | 2026-04-19 | LocationsPage: Increase font size for mobile layout to improve readability
6911b28 | 2026-04-19 | LocationsPage: Update map loading URLs to support environment variables and improve path resolution
ef557e3 | 2026-04-19 | Patch notes for 19th April
```

## Release Notes — April 19th, 2026

## What’s New

- **Results** <br>
    - Added a refresh button to the Leaderboard
- **Locations** <br>
    - Location data has now been pulled from Bulbapedia
    - Re-designed the Locations page to display data at a more granular level
- **Card** <br>
    - Added button which will blur/un-blur the card after mode has been completed (to compare how dumb we are)
    - Added cards from Paldean Wonders, Mega Shine, Perfect Order sets
- **Details** <br>
    - Added button which will zoom/un-zoom the image after mode has been completed (to compare how dumb we are)

## Commits included (newest first)

```text
1d14b72 | 2026-04-19 | SilhouettePage & ZoomPage: Add toggle buttons to show silhouette and zoomed images on correct guesses
df89ed1 | 2026-04-19 | Card: Add blur effect toggle for correct guesses and compute blur level based on guess count
7f63c34 | 2026-04-19 | Getting the new locations grid working on mobile
2345738 | 2026-04-19 | Results Page: Added refresh button to Leaderboard
2ec0b16 | 2026-04-19 | More pokemon locations work
23525f8 | 2026-04-18 | Enhance LocationsPage: Update chance cell styles and improve mobile responsiveness for table headers
ab3ea63 | 2026-04-18 | Enhance LocationsPage: Add background colors for time-of-day cells and improve footprint display
d908565 | 2026-04-17 | More work on locations
1eb22d7 | 2026-04-17 | Working on locations
4eef1a9 | 2026-04-16 | Add scripts for merging and scraping Pokemon encounter data
7658d82 | 2026-04-10 | Update card manifest: Remove duplicate images and add new entries
6f4e46e | 2026-04-10 | New Cards: Perfect Order
84efe4d | 2026-04-10 | New Cards: Mega Shine
0f437ef | 2026-04-10 | New Cards: Paldean Wonders
```

## Release Notes — April 8th, 2026

## What’s New

- **Overall** <br>
    - Added banner when today is a themed day
- **Results** <br>
    - Added Today's Leaderboard and Group Results areas (results are now stored in Supabase db)
    - Added new images to be selected for results tcg card
- **Card Mode** <br>
    - Split out blur level scales so that Full Art and Special cards are different (Special cards will be slightly less blurred)
- **Locations Mode** <br>
    - Made "can't be found in the wild" text bigger and underlined (as well as being bright red)
    - Only include % chance for certain encounter methods
- **Silhouette Mode** <br>
    - Slightly zoomed out initial clue
- **Pokedex Mode** <br>
    - Remove duplicate pokedex entries so that the 2nd entry clue can't be the same as the 1st

## Commits included (newest first)

```text
5199318 | 2026-04-08 | Results: Added an overall leaderboard for today
8844835 | 2026-04-08 | Added banner when today is a themed day
fa851ff | 2026-04-08 | Locations: Made "can't be found in the wild" text bigger and underlined (as well as being bright red)
0e30335 | 2026-04-08 | Silhouette: Slightly zoomed out initial clue
5c15f83 | 2026-04-08 | Card: Split out blur level scales so that Full Art and Special cards are different (Special cards will be slightly less blurred)
ed987f6 | 2026-04-08 | Added more results images
c8edfa1 | 2026-03-21 | Added Group Results section to results page
6bf0d40 | 2026-03-21 | Started work on new logo (Slowpokle)
601a971 | 2026-03-20 | Results: Invert guess numbering to reflect chronological order in submissions
28aa4b9 | 2026-03-20 | Update version to 0.5.0 and enhance result submission with client version and device info
dadb94e | 2026-03-20 | Adding Supabase db for tracking results
c65f026 | 2026-03-18 | Pokedex: Remove duplicate pokedex entries so that the 2nd entry clue can't be the same as the 1st
572ed1b | 2026-03-11 | Locations: Only include % chance for certain encounter methods
223f65c | 2026-03-11 | Results: Name for card should persist between days now
66fd660 | 2026-03-11 | Results: Fix overlapping pokedle numbers on mobile
70502d7 | 2026-03-11 | Fixing some Pokemon Data entries
7d79a6b | 2026-02-27 | Fixed issue with overriding pokemon on Fridays
82a3a94 | 2026-02-27 | Adding new override
3687636 | 2026-02-25 | Added more results images
```

## Release Notes — February 25, 2026

## What’s New

- **Card Mode** <br>
    - Full card is revealed after 3 guesses (instead of 4)
- **Pokedex Mode** <br>
    - Added Shape as the first hint given
- **Locations Mode** <br>
    - Added Footprint to the initial clue

## Commits included (newest first)

```text
3b2f563 | 2026-02-25 | Patch notes for 25th Feb
cc33c46 | 2026-02-25 | Card: Reveal the full card after 3 guesses instead of 4
5e30abd | 2026-02-25 | Pokedex: Added shape as first hint
52effd9 | 2026-02-25 | Locations: Added footprint clue to locations
c13ece8 | 2026-02-25 | Fixed Mawile typo in pokedex entry
ee4b9ed | 2026-02-25 | Added shapes from Bulbapedia
717dd4f | 2026-02-25 | Added shape back into pokemon_data.json
abf4521 | 2026-02-25 | Added footprint scraping scripts
0963ece | 2026-02-18 | Patch notes for 18th Feb
```

## Release Notes — February 18, 2026

## What’s New

- **Classic Mode** <br>
    - Height arrows now scale based on metre difference:
        - < 0.25m: Very Small
        - 0.25m - 0.99m: Small
        - 1m - 2m: Medium
        - \> 2m: Large
    - Weight arrows now scale based on kg difference:
        - < 5kg: Very Small
        - 5kg - 9.99kg: Small
        - 10kg - 19.99kg: Medium
        - ≥ 20kg: Large
- **Pokemon Selection Logic** <br>
    - Added logic to prevent repeating of pokemon. For each mode, Pokemon will not repeat within a 4 week period
- **Results** <br>
    - Added holo effects to generated result card
    - Generated card should be retained between sessions and page switches

## Commits included (newest first)

```text
cf34738 | 2026-02-18 | Classic: Rework of height/weight arrows to give better feedback
2d05697 | 2026-02-18 | Added logic to prevent repeating of pokemon. For each mode, Pokemon will not repeat within a 4 week period
5ff3bce | 2026-02-13 | Added new results images
41b8a02 | 2026-02-13 | Retain card between sessions and page switches
5a65cd4 | 2026-02-13 | Tweaked rotation on results card
1ef6fda | 2026-02-13 | Results: Adding some new animations to the results card
83a8ade | 2026-02-13 | Results Page: Added Holo effect to card
ab14a4f | 2026-02-13 | Patch Notes for 13th Feb
```

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

- **Classic Mode** <br>
    - Added arrows to congrats message for Height/Weight
- **Silhouette Mode** <br>
    - Made this mode a bit easier by decreasing the intital zoom-in value. And the image zooms out a bit more with each guess
- **Locations Mode** <br>
    - Removed "Rock Smash" when only showing Gen 1 locations.
    - Fixed issue with Ruins of Alph map not displaying
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

- **Card Mode** <br>
    - Re-classified some cards from Full Art to Special Illustration. Removed some regional variant cards
- **Locations Mode** <br>
    - Re-worded messaging around when a Pokemon can't be found in the wild to make it more obvious
- **Results Page** <br>
    - Tweak logic around results message appearing on card

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

- **Classic Mode** <br>
    - Added sprites, type styling and habitat images
- **Card Mode** <br>
    - Added latest TCG Pocket expansion (Crimson Blaze) to card list
- **Colours Mode** <br>
    - Fixed some bugs around the hints and hint placeholders
- **Locations Mode** <br>
    - Updated tooltip to contain all known encounter methods

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

- **Locations Mode** <br>
    - Re-working Locations Mode to include game names in the clues, tweaked logic behind hints to provide extra clues
- **Results Mode** <br>
    - Truncate name textfield to prevent overflow on generated card image, added message down bottom based on score
- **Pokedex Mode** <br>
    - 2nd hint is now the Pokemon Genus, before moving onto the other pokedex entries
- **Colours Mode** <br>
    - Added a pixelated mosaic as the first hint given, to help certain people who aren't very good at this mode

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

- **Eyes Mode** <br>
    - Added new Eyes Mode, guess the pokemon based on their eyes!
- **Details Mode** <br>
    - Added a new 'Details Mode' which will alternate between Zoom and Silhouette Modes (with Eyes mode on Friday)
- **Card Mode** <br>
    - Slightly reduced blur level for Full Art and Illustration cards
- **Colours Mode** <br>
    - Hints given are now the Pokemon's Types, and then the Generation (after 3 then 6 guess respectively). Re-generated Colour blocks with different parameters
- **Locations Mode** <br>
    - Added new Locations Mode (replacing Game Info), shows the maps where the Pokemon is found straight away
- **Results Page** <br>
    - Allow user to generate a TCG Card with their results on it, and generate a Guesses Image with all of their guesses in it. Changed 'Last 7 Days' section to use Pokedle numbers instead of weekdays

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

- **Silhouette Page** <br>
    - Reworked the translate logic to use the new center-based approach
- **Zoom Page** <br>
    - Reworked the translate logic to use the new center-based approach
- **Card Page** <br>
    - Fixed issue where full art example image wasn't showing
- **Results Page** <br>
    - Fixed issue where Game Data score wasn't displaying in 'Last 7 Days' section
- **Game Data** <br>
    - Trim effects text to remove fullstop
- **All Pages** <br>
    - Removed restriction on number of pokemon displayed in GuessInput box

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

- **Game Data** <br>
    - Abilities now include short effect descriptions so the Abilities clue is more informative.
    - The first clue will never be `shape` or `Base Stats`; `locations` and `held_items` are now prevented from being chosen first when their arrays are empty.
    - Location tidy-ups (removed incorrect/obsolete entries such as the burned tower mapping for some Kanto Pokémon).

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

- **Game Info Page** <br>
    - Moves learnt are now pulled from Gen 3, they are also now grouped and displayed by level (eg. "Lvl 1 - Vine Whip, Tackle").
- **Results Page** <br>
    - Fixed issue where scrolling in 'Last 7 Days' section causes page swipe to trigger
- **Zoom Page** <br>
    - Zoom Page should now only select zoom-in point if it contains more than one colour
- **Shiny Saturday** <br>
    - Reduced 'Shiny Saturday' chance to be 10% (changed from 50%)
- **Card Page** <br>
    - Slightly reduce blur levels for Full Art / Illustration cards

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

- **Game Info Page** <br>
    - Added animation to some map locations
    - Fixed extra space in locations list
    - Clues are given every 2 guesses
    - Tweaked stats bars to be max of 255 for Health and 180 for all other stats
- **Results Page** <br>
    - Use Pokedle # rather than a local date when copying/sharing results.
- **Zoom Page** <br>
    - Added animation to zoom out after a correct guess so the user has a chance to see the full image.
- **Silhouette Page** <br>
    - Added animation to zoom out after a correct guess so the user has a chance to see the full image
    - Slightly increased the maximum zoom level for an improved reveal effect

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

- **Game Info Mode** <br>
    - Location names in Game Info are now links that open a popup showing the corresponding map image (when available) from the assets repo.
- **Zoom Mode** <br>
    - The chosen zoom focus centers reliably (hopefully), mirroring is handled correctly.
- **Silhouette Mode** <br>
    - Transform-origin behavior now holds for early guesses and then eases toward the center over subsequent guesses to produce more intuitive reveals.
- **Card Mode** <br>
    - Continue to un-blur card beyond 8 guesses
- **Pokemon Data Cleanup** <br>
    - Removed Altering Cave from pokemon_data.json, changed "Deoxys Normal" to "Deoxys" and fixed Pokedex entry
- **Map Tooling (developer)** <br>
    - New scripts to download Bulbapedia maps, generate a todo/overrides file for unmapped locations, and fuzzy-match existing map files to in-game location names. The downloader skips existing files by default and records missing/failed items for easy follow-up.

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

- **Improved Card Reveal** <br>
    - Reduced initial blur and tuned progressive reveal so card hints feel more informative and consistent as you guess.
- **Smoother Silhouette Zooming** <br>
    - The silhouette zoom focuses more intuitively as you guess: the focal area stays useful earlier and drifts toward center later in the guess sequence, producing less confusing reveals.
- **No More Image Drags** <br>
    - Images (silhouette, zoom, colour hints, card images) can no longer be dragged or opened in a new tab by accident.
- **Clearer Celebration Message** <br>
    - The congrats message now emphasizes your guess count for a more satisfying win display.
- **Better Confetti Timing** <br>
    - Confetti triggers are timed to the visible congrats message to reduce jarring or mistimed celebrations.
- **Celebration Text** <br>
    - Fixed day/number calculations and added per-user persistent emoji and prefix choices for consistent celebrations.
- **Game Reset Time** <br>
    - Game reset time standardized to **6:00 PM UTC** (equivalent local times: 5:00 AM AET/Melbourne, 7:00 AM NZT, 7:00 PM GMT).
- **Colours Mode Tweaks** <br>
    - Changed grouping threshold for colour mode and re-generated images

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


Use this command to get git commits:
git log --oneline --since="2026-04-09" --until="2026-04-19" --pretty=format:"%h | %ad | %s" --date=short