# Release Notes — November 26, 2025

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

## Commits included (newest first)

```
e70c759 | Adjust height and weight scaling factors in ClassicPage; update match/partial/miss styles
c713d0e | Refactor image scaling logic in SilhouettePage: adjust transform-origin based on guess count
29974ad | #75 - Prevent image dragging and context menu on multiple pages
4f56284 | Enhance CongratsMessage: emphasize guess count
9dec562 | #76 - Fix epoch definition in CongratsMessage: set first day to 2025-11-24
fc6d1bc | #72 - Refactor emoji selection and phrase generation in CongratsMessage; add persistent storage
c9ca6eb | #70 - Refactor blur level logic in CardPage
ca912ea | #69 - Enhance confetti display logic and pending state handling
```

