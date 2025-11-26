Release Notes — November 26, 2025

Overview
- This update improves gameplay polish and feedback: silhouette zoom behavior is more natural, images can't be accidentally dragged or opened, and celebration and score feedback are clearer and more consistent.

What’s New (User-Facing)
- Improved Card Reveal: Reduced initial blur on card. Progressive reveal/blur on card pages has been tuned so hints feel more informative and consistent as you guess.
- Smoother Silhouette Zooming: The silhouette zoom now focuses more intuitively as you guess — the zoom behavior keeps the important part of the silhouette visible longer and relaxes toward center later in the guess sequence. Result: easier, less confusing reveals during play.
- No More Image Drags: Images across the site (silhouette, zoom, colour hints, and card images) can no longer be dragged or opened in a new tab.
- Clearer Celebration Message: The congrats message now highlights your guess count so wins feel more satisfying and easier to read.
- Better Confetti Timing: Confetti only runs when it makes sense (after a visible congrats message), so celebrations feel timed correctly and less jarring.
- Celebration Text: Fixed Pokedle number (eg. Pokedle #1), random emoji per user, random congrats prefix message per user
- Game Reset time: Game now resets at 6pm UTC (5am Melbourne Time, 7am NZ Time, 7pm London Time)

Commits included (chronological, newest first)
- e70c759 | Adjust height and weight scaling factors in ClassicPage; update match/partial/miss styles
- c713d0e | Refactor image scaling logic in SilhouettePage: adjust transform-origin based on guess count
- 29974ad | #75 - Prevent image dragging and context menu on multiple pages
- 4f56284 | Enhance CongratsMessage: emphasize guess count
- 9dec562 | #76 - Fix epoch definition in CongratsMessage: set first day to 2025-11-24
- fc6d1bc | #72 - Refactor emoji selection and phrase generation in CongratsMessage; add persistent storage
- c9ca6eb | #70 - Refactor blur level logic in CardPage
- ca912ea | #69 - Enhance confetti display logic and pending state handling

Saved: PATCH_NOTES.md
