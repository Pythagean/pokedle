import React, { useState, useEffect, useRef } from 'react';
import { RESET_HOUR_UTC } from '../config/resetConfig';

export default function ResultsPage({ results = [], guessesByPage = {}, onBack, backgroundsManifest = null }) {
    const [copied, setCopied] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [exportStatus, setExportStatus] = useState(null);
    const [exportError, setExportError] = useState(null);
    const [cardPreviewUrl, setCardPreviewUrl] = useState(null);
    const [cardName, setCardName] = useState('');
    const [generatedDisabled, setGeneratedDisabled] = useState(false);

    // Fallback: if no results provided, attempt to read a global exported value
    if ((!results || results.length === 0) && typeof window !== 'undefined' && window.__pokedle_results__) {
        results = window.__pokedle_results__;
    }

    const d = new Date();
    const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    // Compute the canonical Pokedle day number using the same method as `CongratsMessage`.
    const effectiveUTCDate = (dt) => {
        const dd = new Date(dt);
        let day = new Date(Date.UTC(dd.getUTCFullYear(), dd.getUTCMonth(), dd.getUTCDate(), 0, 0, 0));
        if (dd.getUTCHours() >= RESET_HOUR_UTC) {
            day = new Date(Date.UTC(dd.getUTCFullYear(), dd.getUTCMonth(), dd.getUTCDate() + 1, 0, 0, 0));
        }
        return day;
    };
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const todayEffective = effectiveUTCDate(new Date());
    const epoch = effectiveUTCDate(new Date('2025-11-24T00:00:00Z'));
    const dayNumber = Math.floor((todayEffective.getTime() - epoch.getTime()) / MS_PER_DAY) + 1;
    const pokedleLabel = `Pokédle #${dayNumber}`;
    const entries = (results || []).map(r => ({ label: r.label, value: r.solved ? r.guessCount : '-' }));
    const total = entries.reduce((acc, e) => acc + (typeof e.value === 'number' ? e.value : 0), 0);
    const allCompleted = Array.isArray(results) && results.length > 0 && results.every(r => r && r.solved);
    const summaryLines = [`I've completed all the modes of ${pokedleLabel}! \n`, ...entries.map(e => `${e.label}: ${e.value}`), `Total: ${total}`];
    const summaryText = summaryLines.join('\n');

    const detailedLines = [ `I've completed all the modes of ${pokedleLabel}! \n` ];
    (results || []).forEach(r => {
        const guesses = (guessesByPage && guessesByPage[r.key]) || [];
        const names = guesses.slice().reverse().map(g => g.name).filter(Boolean);
        const displayNames = (r.solved && names.length > 0) ? ` (${names.join(', ')})` : '';
        const countDisplay = r.solved ? guesses.length : '-';
        detailedLines.push(`${r.label}: ${countDisplay}${displayNames}`);
    });
    detailedLines.push(`Total: ${total}`);
    const detailedText = detailedLines.join('\n');

    const handleCopy = async () => {
        try {
            const toCopy = showDetails ? detailedText : summaryText;
            await navigator.clipboard.writeText(toCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 1300);
        } catch (e) {
            // ignore
        }
    };

    // Generate a PNG card (500x700) using a randomly chosen template from the available types.
    const TEMPLATE_OPTIONS = ['dark','dragon','electric','fighting','fire','grass','normal','psychic','steel','water'];

    const loadImage = (src) => new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });

    // Generate a sprite grid showing guessed Pokémon for each mode
    const generateSpriteGrid = async (userName) => {
        try {
            // Wait for fonts
            try {
                if (document && document.fonts && document.fonts.load) {
                    await document.fonts.load('700 20px "Montserrat"');
                    await document.fonts.ready;
                }
            } catch (e) {}

            const dpi = window.devicePixelRatio || 1;
            const spriteSize = 64;
            const headerHeight = 40;
            const rowGap = 16;
            const leftMargin = 20;
            const topMargin = 20;

            // Build rows: each mode gets a header + row of sprites
            // Reverse order so the correct guess (last in the guesses array)
            // appears on the left (index 0). We'll also mark the leftmost
            // sprite visually as the correct one.
            const rows = [];
            for (const r of results || []) {
                const guesses = (guessesByPage && guessesByPage[r.key]) || [];
                const pokemonIds = guesses.map(g => g.id).filter(Boolean);
                const count = guesses.length;
                if (pokemonIds.length > 0) {
                    // reverse so last guess (correct) is first in the drawn row
                    const ids = pokemonIds.slice().reverse();
                    rows.push({ label: r.label, ids, count });
                }
            }

            if (rows.length === 0) {
                return { status: 'error', message: 'no_guesses' };
            }

            // Calculate canvas size
            const maxSprites = Math.max(...rows.map(row => row.ids.length));
            const canvasWidth = leftMargin * 2 + maxSprites * spriteSize + (maxSprites - 1) * 8;
            const canvasHeight = topMargin * 2 + rows.length * (headerHeight + spriteSize + rowGap);

            const canvas = document.createElement('canvas');
            canvas.width = Math.round(canvasWidth * dpi);
            canvas.height = Math.round(canvasHeight * dpi);
            canvas.style.width = `${canvasWidth}px`;
            canvas.style.height = `${canvasHeight}px`;
            const ctx = canvas.getContext('2d');
            ctx.scale(dpi, dpi);

            // Helper: draw a rounded rectangle path (does not stroke/fill itself)
            const roundedRectPath = (ctx, x, y, w, h, r) => {
                const radius = Math.min(r, w / 2, h / 2);
                ctx.beginPath();
                ctx.moveTo(x + radius, y);
                ctx.arcTo(x + w, y, x + w, y + h, radius);
                ctx.arcTo(x + w, y + h, x, y + h, radius);
                ctx.arcTo(x, y + h, x, y, radius);
                ctx.arcTo(x, y, x + w, y, radius);
                ctx.closePath();
            };

            // Try to preload a small marker icon to indicate the correct guess.
            // This should be available in the `public/icons` folder as `classic.png`.
            let markerIcon = null;
            try {
                markerIcon = await loadImage('icons/classic.png');
            } catch (e) {
                markerIcon = null;
            }

            // Fill background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            // Draw title
            const titleSuffix = userName && String(userName).trim().length > 0 ? String(userName).trim() : 'Guesses';
            ctx.font = '700 24px "Montserrat", Arial, sans-serif';
            ctx.fillStyle = '#111';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(`${pokedleLabel} - ${titleSuffix}`, leftMargin, topMargin - 8);

            let y = topMargin + 32;

            // Draw each mode row
            for (const row of rows) {
                // Draw mode label with guess count
                ctx.font = '700 18px "Montserrat", Arial, sans-serif';
                ctx.fillStyle = '#333';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText(`${row.label} (${row.count})`, canvasWidth / 2, y);
                y += headerHeight;

                // Load and draw sprites (rightmost = last index = correct guess)
                // Right-align the row by calculating starting x position
                const rowWidth = row.ids.length * spriteSize + (row.ids.length - 1) * 4;
                let x = canvasWidth - leftMargin - rowWidth;
                for (let i = 0; i < row.ids.length; i++) {
                    const id = row.ids[i];
                    const drawX = x;
                    // Set opacity for non-correct guesses
                    const isCorrectGuess = i === row.ids.length - 1;
                    ctx.globalAlpha = isCorrectGuess ? 1.0 : 0.65;
                    try {
                        const spriteUrl = `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/sprites_trimmed/${id}-front.png`;
                        const sprite = await loadImage(spriteUrl);
                        ctx.drawImage(sprite, drawX, y, spriteSize, spriteSize);
                    } catch (e) {
                        // Draw placeholder box on error
                        ctx.fillStyle = '#f0f0f0';
                        ctx.fillRect(drawX, y, spriteSize, spriteSize);
                        ctx.strokeStyle = '#ccc';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(drawX, y, spriteSize, spriteSize);
                    }
                    // Reset globalAlpha
                    ctx.globalAlpha = 1.0;

                    // If this is the rightmost/last sprite, mark it as the correct guess
                    if (isCorrectGuess) {
                        try {
                            // Draw a green border around the sprite
                            ctx.lineWidth = 3;
                            ctx.strokeStyle = '#e13434ff';
                            // Draw rounded border around the sprite
                            try {
                                roundedRectPath(ctx, drawX - 1.5, y - 1.5, spriteSize + 3, spriteSize + 3, 8);
                                ctx.stroke();
                            } catch (e) {
                                // fallback to rectangular stroke if rounded path fails
                                ctx.strokeRect(drawX - 1.5, y - 1.5, spriteSize + 3, spriteSize + 3);
                            }

                                    // Draw a small marker image if available; otherwise fall back to a green check.
                                    const cx = drawX + 12;
                                    const cy = y + 12;
                                    const markerSize = 20;
                                    if (markerIcon) {
                                        try {
                                            ctx.drawImage(markerIcon, cx - markerSize / 2, cy - markerSize / 2, markerSize, markerSize);
                                        } catch (e) {
                                            // if drawing fails, fall back to the old check
                                            ctx.beginPath();
                                            ctx.fillStyle = '#e13434ff';
                                            ctx.arc(cx, cy, 10, 0, Math.PI * 2);
                                            ctx.fill();
                                            ctx.fillStyle = '#fff';
                                            ctx.font = '700 12px "Montserrat", Arial, sans-serif';
                                            ctx.textAlign = 'center';
                                            ctx.textBaseline = 'middle';
                                            ctx.fillText('✓', cx, cy + 0.5);
                                        }
                                    } else {
                                        ctx.beginPath();
                                        ctx.fillStyle = '#e13434ff';
                                        ctx.arc(cx, cy, 10, 0, Math.PI * 2);
                                        ctx.fill();
                                        ctx.fillStyle = '#fff';
                                        ctx.font = '700 12px "Montserrat", Arial, sans-serif';
                                        ctx.textAlign = 'center';
                                        ctx.textBaseline = 'middle';
                                        ctx.fillText('✓', cx, cy + 0.5);
                                    }
                        } catch (e) {
                            // ignore overlay drawing errors
                        }
                    }

                    x += spriteSize + 4;
                }
                y += spriteSize + rowGap;
            }

            // Export blob
            return await new Promise((resolve) => {
                canvas.toBlob(async (blob) => {
                    if (!blob) { resolve({ status: 'error', message: 'no_blob' }); return; }
                    const url = URL.createObjectURL(blob);
                    // Try clipboard
                    try {
                        if (navigator.clipboard && window.ClipboardItem) {
                            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                            resolve({ status: 'clipboard', url });
                            return;
                        }
                    } catch (e) {}
                    // Fallback download
                    try {
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${pokedleLabel.replace(/\s+/g, ' ')}-guesses.png`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                    } catch (e) {}
                    resolve({ status: 'downloaded', url });
                }, 'image/png');
            });
        } catch (err) {
            console.error('generateSpriteGrid failed', err);
            return { status: 'error', message: err && err.message ? err.message : String(err) };
        }
    };

    const generateCardImage = async (useDetails, extraName) => {
        try {
            const dpi = window.devicePixelRatio || 1;
            const W = 500, H = 700;
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(W * dpi);
            canvas.height = Math.round(H * dpi);
            canvas.style.width = `${W}px`;
            canvas.style.height = `${H}px`;
            const ctx = canvas.getContext('2d');
            ctx.scale(dpi, dpi);

            // Wait for fonts to load so canvas text renders with chosen Google Fonts
            try {
                if (document && document.fonts && document.fonts.load) {
                    // load weights we intend to use (Montserrat 700 for title/body bold,
                    // Montserrat 500 for body, and Bebas Neue 700 for large Total)
                    await document.fonts.load('700 24px "Montserrat"');
                    await document.fonts.load('500 26px "Montserrat"');
                    await document.fonts.load('700 64px "Bebas Neue"');
                    await document.fonts.ready;
                }
            } catch (e) {
                // ignore font loading failures; fall back to system fonts
            }

            // Build a deterministic RNG seeded by day number + a per-player value
            // sourced from `CongratsMessage` (stored in localStorage). We prefer
            // the persisted phrase (pokedle_phrase_...) for the current day;
            // fall back to the day's emoji (pokedle_emoji_...) if present. This
            // gives a stable per-player seed without relying on the typed name.
            let storedPlayerSeed = '';
            try {
                const dayKey = effectiveUTCDate(new Date()).toISOString().slice(0,10).replace(/-/g, '');
                // Look for the persisted custom phrase first
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (!k) continue;
                    if (k.indexOf(`pokedle_phrase_${dayKey}_`) === 0) {
                        storedPlayerSeed = localStorage.getItem(k) || '';
                        break;
                    }
                }
                // If no phrase found, try the emoji key used by CongratsMessage
                if (!storedPlayerSeed) {
                    for (let i = 0; i < localStorage.length; i++) {
                        const k = localStorage.key(i);
                        if (!k) continue;
                        if (k.indexOf(`pokedle_emoji_${dayKey}_`) === 0) {
                            storedPlayerSeed = localStorage.getItem(k) || '';
                            break;
                        }
                    }
                }
            } catch (e) {
                storedPlayerSeed = '';
            }
            const seedBase = `${dayNumber}-${storedPlayerSeed || ''}`;
            function hashSeed(s) {
                let h = 2166136261 >>> 0;
                for (let i = 0; i < s.length; i++) {
                    h ^= s.charCodeAt(i);
                    h = Math.imul(h, 16777619) >>> 0;
                }
                return h >>> 0;
            }
            function mulberry32(a) {
                return function() {
                    a |= 0;
                    a = (a + 0x6D2B79F5) | 0;
                    let t = Math.imul(a ^ (a >>> 15), 1 | a);
                    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
                    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
                };
            }
            const rng = mulberry32(hashSeed(seedBase));

            // Choose a deterministic template and load it
            const chosenTemplate = TEMPLATE_OPTIONS[Math.floor(rng() * TEMPLATE_OPTIONS.length)];
            const TEMPLATE_URL = `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/results/${chosenTemplate}.png`;
            const isDarkTemplate = String(chosenTemplate).toLowerCase() === 'dark';
            const tpl = await loadImage(TEMPLATE_URL);
            ctx.drawImage(tpl, 0, 0, W, H);

            // Choose an image from the provided backgrounds manifest (if available).
            // The manifest is expected to be shaped { "folder": ["1.png","2.png"] }
            // Declare the image box coordinates outside the try so they are
            // available later when we render the big Total number.
            const boxX = 41, boxY = 66, boxW = 418, boxH = 263;
            try {
                let chosenImg = null;
                if (backgroundsManifest && typeof backgroundsManifest === 'object' && Object.keys(backgroundsManifest).length > 0) {
                    // Map `total` into quality buckets and try to find a matching folder in the manifest.
                    const t = Number(total) && Number(total) >= 0 ? Number(total) : 0;
                    let category = 'Terrible';
                    if (t <= 10) category = 'Great';
                    else if (t <= 17) category = 'Good';
                    else if (t <= 23) category = 'Okay';
                    else if (t <= 29) category = 'Bad';
                    else category = 'Terrible';

                    const keys = Object.keys(backgroundsManifest);
                    // Prefer exact (case-insensitive) match, otherwise substring match
                    let folder = keys.find(k => k.toLowerCase() === category.toLowerCase());
                    if (!folder) folder = keys.find(k => k.toLowerCase().includes(category.toLowerCase()));

                    // If we found a folder matching the category, use it; otherwise fall back to index-based selection
                    let files = [];
                    if (folder) files = backgroundsManifest[folder] || [];
                    if (!folder || files.length === 0) {
                        const fallbackFolders = keys;
                        if (fallbackFolders.length > 0) {
                            const folderIndex = ((t - 1 + fallbackFolders.length) % fallbackFolders.length + fallbackFolders.length) % fallbackFolders.length;
                            const fb = fallbackFolders[folderIndex];
                            files = backgroundsManifest[fb] || [];
                            folder = fb;
                        }
                    }

                    if (files.length > 0) {
                        const file = files[Math.floor(rng() * files.length)];
                        // Construct raw URL assuming assets layout: results/backgrounds/{folder}/{file}
                        const url = `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/results/backgrounds/${folder}/${file}`;
                        try {
                            chosenImg = await loadImage(url);
                        } catch (e) {
                            chosenImg = null;
                        }
                    }
                }

                // Fallback: if no manifest or selection failed, try an existing single random background
                if (!chosenImg) {
                    try {
                        const bgId = Math.floor(rng() * 10) + 1;
                        const bgUrl = `https://raw.githubusercontent.com/Pythagean/pokedle_assets/main/results/backgrounds/${bgId}.png`;
                        chosenImg = await loadImage(bgUrl);
                    } catch (e) {
                        chosenImg = null;
                    }
                }

                if (chosenImg) {
                    // Draw the chosen image to fully cover the box (no padding), preserving aspect ratio
                    const sw = chosenImg.naturalWidth || chosenImg.width;
                    const sh = chosenImg.naturalHeight || chosenImg.height;
                    // Use 'cover' behavior: scale so image fills the box, cropping if necessary
                    const scale = Math.max(boxW / sw, boxH / sh);
                    const dw = sw * scale;
                    const dh = sh * scale;
                    const dx = boxX + (boxW - dw) / 2;
                    const dy = boxY + (boxH - dh) / 2;
                    ctx.drawImage(chosenImg, dx, dy, dw, dh);
                }
            } catch (e) {
                // ignore any errors selecting/drawing the chosen image
            }

            // Build title, optionally appending a user-provided name
            const titleLabel = extraName && String(extraName).trim().length > 0 ? `${pokedleLabel} - ${String(extraName).trim()}` : pokedleLabel;
            // Draw title at 96,31 (left aligned) with stroke and subtle shadow for legibility
            ctx.save();
            ctx.font = '700 24px "Montserrat", Inter, Arial, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            // subtle drop shadow
            ctx.shadowColor = 'rgba(0,0,0,0.18)';
            ctx.shadowBlur = 6;
            // white stroke for contrast over backgrounds
            //ctx.lineWidth = 3;
            //ctx.strokeStyle = 'rgba(255,255,255,0.92)';
            //ctx.strokeText(pokedleLabel, 96, 31);
            // main fill (use white text for dark template)
            ctx.fillStyle = isDarkTemplate ? '#fff' : '#111';
            ctx.fillText(titleLabel, 96, 31);
            ctx.restore();

            // Draw results starting at 45,420 (larger font for readability)
            // Use a slightly larger body font and make the Total line/value bold
            const bodyFont = '500 26px "Montserrat", Inter, Arial, sans-serif';
            const boldBodyFont = '700 26px "Montserrat", Inter, Arial, sans-serif';
            // body text color (white for dark template)
            ctx.fillStyle = isDarkTemplate ? '#fff' : '#222';
            // Move results block slightly lower on the card for better spacing
            const startX = 50, startY = 390;
            const lineHeight = 32;
            // For the exported card, omit the leading 'I've completed...' line
            // and remove the 'Total:' line from the body — we'll render the
            // total as a large number to the right of the image box.
            const rawCardLines = (useDetails ? detailedLines.slice(1) : summaryLines.slice(1)) || [];
            const cardLines = rawCardLines.filter(l => !/^\s*Total\s*:/i.test(String(l)));
            let y = startY;
            const maxWidth = W - startX - 250; // leave some space on the right for the big total
            for (const raw of cardLines) {
                const text = String(raw);
                // Try to split into `Label: value` so we can right-align the value column
                const parts = text.match(/^(.+?):\s*(.+)$/);
                if (parts) {
                    const label = parts[1];
                    const value = parts[2];

                    // Reserve the full text area for the label; draw the value
                    // in a separate column to the right of `maxWidth` so values
                    // line up vertically outside the text block.
                    const gap = 8; // gap between label area and value column
                    const labelMaxWidth = maxWidth;

                    // Wrap the label into lines that fit labelMaxWidth
                    ctx.font = bodyFont;
                    const words = label.split(' ');
                    let line = '';
                    const labelLines = [];
                    for (const w of words) {
                        const test = line.length ? `${line} ${w}` : w;
                        if (ctx.measureText(test).width <= labelMaxWidth) {
                            line = test;
                        } else {
                            if (line.length) labelLines.push(line);
                            line = w;
                        }
                    }
                    if (line.length) labelLines.push(line);

                    const blockStartY = y;
                    // Draw label lines using a top baseline so we can position
                    // subsequent lines exactly with our `lineHeight` increments.
                    ctx.textBaseline = 'top';
                    for (const l of labelLines) {
                        ctx.fillText(l, startX, y);
                        y += lineHeight;
                    }

                    // Draw the value in a fixed column outside the label area.
                    // Use a 'middle' baseline so the value vertically centers
                    // relative to the first label line for consistent alignment.
                    const valueX = startX + maxWidth + gap + 8; // outside label area
                    // Nudge the value a few pixels up so it visually lines up
                    // with the label text (accounts for font metrics differences).
                    const valueY = blockStartY + lineHeight / 2 - 6; // center relative to first line, slight upward nudge
                    ctx.font = boldBodyFont;
                    ctx.textAlign = 'right';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(value, valueX, valueY);
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'top';
                } else {
                    // Fallback: draw the whole line as plain wrapped text
                    ctx.font = bodyFont;
                    if (ctx.measureText(text).width <= maxWidth) {
                        ctx.fillText(text, startX, y);
                        y += lineHeight;
                    } else {
                        const words = text.split(' ');
                        let line = '';
                        for (const w of words) {
                            const test = line.length ? `${line} ${w}` : w;
                            if (ctx.measureText(test).width <= maxWidth) {
                                line = test;
                            } else {
                                ctx.fillText(line, startX, y);
                                y += lineHeight;
                                line = w;
                            }
                        }
                        if (line.length) {
                            ctx.fillText(line, startX, y);
                            y += lineHeight;
                        }
                    }
                }
            }

            // Draw a big Total number to the right of the results text block
            try {
                const totalStr = String(total || 0);
                // position to the right of the results text area (startX + maxWidth)
                // so the total appears beside the results lines rather than beside the image.
                // place it further right than the per-line values so they don't overlap.
                const tentativeTotalX = startX + maxWidth + 90; // TOTAL X VALUE
                const totalX = tentativeTotalX;
                // vertically center the total in the space occupied by the results lines
                const contentBottom = Math.max(y, startY + lineHeight);
                const totalY = startY + (contentBottom - startY) / 2 + 5; // TOTAL Y VALUE
                ctx.save();
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.font = '700 72px "Bebas Neue", "Montserrat", Arial, sans-serif';
                // use white text for dark template, otherwise dark
                ctx.fillStyle = isDarkTemplate ? '#fff' : '#111';
                // subtle shadow for contrast on the text
                ctx.shadowColor = isDarkTemplate ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.12)';
                ctx.shadowBlur = 6;

                // Measure text to compute a suitable circle radius and center
                try {
                    const metrics = ctx.measureText(totalStr || '0');
                    const textWidth = metrics.width || 72;
                    const centerX = totalX + textWidth / 2 + 2;
                    const centerY = totalY - 7; // textBaseline is 'middle'
                    // radius: ensure it's at least half the font size and comfortably contains the digits
                    const radius = Math.max(36, Math.max(textWidth, 72) / 2 + 12);

                    // Draw circle outline behind the text. Disable shadow for the ring so it's crisp.
                    const prevShadowColor = ctx.shadowColor;
                    const prevShadowBlur = ctx.shadowBlur;
                    ctx.shadowColor = 'transparent';
                    ctx.shadowBlur = 0;
                    ctx.lineWidth = 4;
                    ctx.strokeStyle = ctx.fillStyle; // same colour as the text
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                    ctx.stroke();
                    // restore shadow for the text
                    ctx.shadowColor = prevShadowColor;
                    ctx.shadowBlur = prevShadowBlur;
                } catch (e) {
                    // ignore measurement/drawing failures and continue to draw the text
                }

                // Draw the total number on top of the ring
                ctx.fillText(totalStr, totalX, totalY);
                ctx.restore();
            } catch (e) {
                // ignore any drawing errors
            }

            // Export blob and return an object URL for preview. Also attempt clipboard copy
                    return await new Promise((resolve) => {
                canvas.toBlob(async (blob) => {
                    if (!blob) { resolve({ status: 'error', message: 'no_blob' }); return; }
                    const url = URL.createObjectURL(blob);
                    // Try to copy to clipboard first (but keep the object URL for preview)
                    try {
                        if (navigator.clipboard && window.ClipboardItem) {
                            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                            resolve({ status: 'clipboard', url });
                            return;
                        }
                    } catch (e) {
                        // ignore clipboard errors
                    }
                    // Fallback: trigger a download but still return the object URL for preview
                    try {
                        const a = document.createElement('a');
                        a.href = url;
                        const safeLabel = pokedleLabel.replace(/\s+/g, ' ');
                        a.download = `${safeLabel}.png`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                    } catch (e) {
                        // ignore download errors
                    }
                    resolve({ status: 'downloaded', url });
                }, 'image/png');
            });
        } catch (err) {
            console.error('generateCardImage failed', err);
            return { status: 'error', message: err && err.message ? err.message : String(err) };
        }
    };

    // Load history of simple daily summaries from localStorage (written by App)
    const [history, setHistory] = useState([]);
    useEffect(() => {
        try {
            const raw = localStorage.getItem('pokedle_results_history');
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return;
            // Keep the full parsed history in reverse-chronological order (newest first)
            const full = parsed.slice().reverse();
            setHistory(full);
        } catch (e) {
            // ignore
        }
    }, []);

    // detect mobile (match CSS breakpoint) so we can widen content on small screens
    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;
        const mq = window.matchMedia('(max-width: 600px)');
        const set = () => setIsMobile(mq.matches);
        set();
        try {
            mq.addEventListener('change', set);
        } catch (e) {
            // Safari fallback
            mq.addListener(set);
        }
        return () => {
            try { mq.removeEventListener('change', set); } catch (e) { mq.removeListener(set); }
        };
    }, []);

    // Revoke object URL when preview changes or component unmounts
    useEffect(() => {
        return () => {
            try {
                if (cardPreviewUrl) URL.revokeObjectURL(cardPreviewUrl);
            } catch (e) {
                // ignore
            }
        };
    }, [cardPreviewUrl]);

    // Prevent horizontal scroll gestures inside the history scroller from
    // propagating to parent handlers (which may interpret them as page swipes).
    const historyTouchStart = useRef(null);
    const onHistoryTouchStart = (ev) => {
        try {
            if (ev.touches && ev.touches.length === 1) {
                historyTouchStart.current = { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
            } else {
                historyTouchStart.current = null;
            }
        } catch (e) {
            historyTouchStart.current = null;
        }
    };
    const onHistoryTouchMove = (ev) => {
        try {
            if (!historyTouchStart.current || !(ev.touches && ev.touches.length === 1)) return;
            const dx = ev.touches[0].clientX - historyTouchStart.current.x;
            const dy = ev.touches[0].clientY - historyTouchStart.current.y;
            // If the gesture is primarily horizontal, stop propagation so parent
            // doesn't treat it as a page-swipe. We don't preventDefault so scrolling still works.
            if (Math.abs(dx) > Math.abs(dy)) {
                ev.stopPropagation();
            }
        } catch (e) {
            // ignore
        }
    };
    const onHistoryWheel = (ev) => {
        try {
            // If wheel event indicates horizontal scroll (or shifted scroll), stop propagation
            if (ev.shiftKey || Math.abs(ev.deltaX) > Math.abs(ev.deltaY)) {
                ev.stopPropagation();
            }
        } catch (e) {
            // ignore
        }
    };

    const outerStyle = {
        padding: 0,
        maxWidth: isMobile ? '100%' : 780,
        margin: '0px auto',
        alignItems: 'center',
        fontFamily: 'Inter, Arial, sans-serif',
        width: isMobile ? 'calc(100% - 20px)' : 'calc(100% - 48px)'
    };

    const summaryMax = isMobile ? '100%' : 580;
    const historyMax = isMobile ? '100%' : 780;

    return (
        <div style={outerStyle}>
            <div style={{ textAlign: 'center', marginTop: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                    <h2 style={{ marginBottom: 10 }}>Results</h2>
                </div>
            </div>

            <div style={{ position: 'relative', borderRadius: 6, padding: 18, background: 'rgba(255,255,255,0.98)', border: '1px solid #f0f0f0', overflow: 'hidden', maxWidth: summaryMax, alignContent: 'center', marginLeft: 'auto', marginRight: 'auto' }}>
                <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: `url('icons/results.png')`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', opacity: 0.06, filter: 'grayscale(40%)', pointerEvents: 'none', margin: '65px' }} />
                {/* Small section header for today's summary */}
                <div style={{ textAlign: 'center', marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, textAlign: 'center' }}>Today ({pokedleLabel})</div>
                </div>

                {!showDetails ? (
                    entries.map((e, i) => (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', padding: '10px 0', lineHeight: '1.1', borderBottom: i !== entries.length - 1 ? '1px solid #fafafa' : 'none' }}>
                            <span style={{ fontWeight: 500, fontSize: 15, color: '#222', justifySelf: 'start', textAlign: 'left' }}>{e.label}:</span>
                            <span style={{ fontWeight: 700, fontSize: 16, textAlign: 'right', justifySelf: 'end' }}>{e.value}</span>
                        </div>
                    ))
                ) : (
                    <div>
                        {results.map((r, i) => {
                            const guesses = (guessesByPage && guessesByPage[r.key]) || [];
                            const names = guesses.slice().reverse().map(g => g.name).filter(Boolean);
                            const count = guesses.length;
                            const countDisplay = r.solved ? count : '-';
                            // Determine the correct name for this page (card page stores pokemon under daily.pokemon)
                            let correctName = null;
                            try {
                                if (r && r.daily) {
                                    correctName = r.daily.pokemon ? r.daily.pokemon.name : r.daily.name;
                                }
                            } catch (e) {
                                correctName = null;
                            }
                            return (
                                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', padding: '8px 0', lineHeight: '1.3', borderBottom: i !== results.length - 1 ? '1px solid #fafafa' : 'none' }}>
                                    <span style={{ fontWeight: 500, fontSize: 15, color: '#222', justifySelf: 'start', textAlign: 'left' }}>
                                        {r.label}
                                        {names.length > 0 ? (
                                            <>
                                                {' ('}
                                                {names.map((n, idx) => (
                                                    <React.Fragment key={idx}>
                                                        {idx > 0 ? ', ' : ''}
                                                        {n === correctName ? <strong>{n}</strong> : n}
                                                    </React.Fragment>
                                                ))}
                                                {')'}
                                            </>
                                        ) : null}
                                        :
                                    </span>
                                    <span style={{ fontWeight: 700, fontSize: 16, textAlign: 'right', justifySelf: 'end' }}>{countDisplay}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
                {copied && <div style={{ color: '#1976d2', fontSize: 14 }}>Copied to clipboard</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <button onClick={async () => {
                            // Toggle details and ensure Generate becomes enabled for edits
                            const newShow = !showDetails;
                            setGeneratedDisabled(false);
                            setShowDetails(newShow);

                            // If a preview already exists, automatically generate the other image
                            try {
                                if (cardPreviewUrl) {
                                    setExportError(null);
                                    setExportStatus('working');
                                    let res = null;
                                    if (newShow) {
                                        // switched into details: generate sprite grid
                                        res = await generateSpriteGrid(cardName && String(cardName).trim().slice(0,50));
                                    } else {
                                        // switched out of details: generate the card image
                                        res = await generateCardImage(false, cardName && String(cardName).trim().slice(0,50));
                                    }
                                    if (res && typeof res === 'object' && res.url) {
                                        try { if (cardPreviewUrl) URL.revokeObjectURL(cardPreviewUrl); } catch (e) {}
                                        setCardPreviewUrl(res.url);
                                        if (res.status === 'clipboard') setExportStatus('copied');
                                        else if (res.status === 'downloaded') setExportStatus('downloaded');
                                        else setExportStatus(null);
                                        // mark as generated so further edits re-enable
                                        setGeneratedDisabled(true);
                                    } else if (res && res.status === 'error') {
                                        setExportError(res.message || 'unknown');
                                        setExportStatus('failed');
                                    } else {
                                        setExportError(null);
                                        setExportStatus('failed');
                                    }
                                }
                            } catch (e) {
                                setExportError(e && e.message ? e.message : String(e));
                                setExportStatus('failed');
                            }
                            setTimeout(() => setExportStatus(null), 1700);
                            setTimeout(() => setExportError(null), 4000);
                        }} style={{ height: 40, padding: '8px 12px', borderRadius: 8, background: showDetails ? '#1976d2' : '#efefef', color: showDetails ? '#fff' : '#111', border: '1px solid #e0e0e0', cursor: 'pointer', fontSize: 14 }}>{showDetails ? 'Hide Guesses' : 'Show Guesses'}</button>
                        <button onClick={handleCopy} title="Copy" style={{ height: 40, minWidth: 64, borderRadius: 8, border: '1px solid #e0e0e0', background: '#efefef', cursor: 'pointer', padding: '0 12px', fontSize: 14, color: '#111', WebkitTextFillColor: '#111', forcedColorAdjust: 'none' }}>Copy</button>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 16, textAlign: 'right' }}>{`Total: ${total}`}</div>
                </div>
                
            </div>
            {/* Card export container: placed below Today's results */}
            <div style={{ marginTop: 12, maxWidth: summaryMax, marginLeft: 'auto', marginRight: 'auto', padding: 12, borderRadius: 6, background: '#fff', border: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexDirection: isMobile ? 'column' : 'row', width: isMobile ? '100%' : 'auto' }}>
                        
                        <button
                            onClick={async () => {
                                try {
                                    setExportError(null);
                                    setExportStatus('working');
                                    const res = showDetails 
                                        ? await generateSpriteGrid(cardName && String(cardName).trim().slice(0,50)) 
                                        : await generateCardImage(showDetails, cardName && String(cardName).trim().slice(0,50));
                                    if (res && typeof res === 'object' && res.url) {
                                        try { if (cardPreviewUrl) URL.revokeObjectURL(cardPreviewUrl); } catch (e) {}
                                        setCardPreviewUrl(res.url);
                                        if (res.status === 'clipboard') setExportStatus('copied');
                                        else if (res.status === 'downloaded') setExportStatus('downloaded');
                                        else setExportStatus(null);
                                        // disable generating again until the user edits the name
                                        setGeneratedDisabled(true);
                                    } else if (res && res.status === 'error') {
                                        setExportError(res.message || 'unknown');
                                        setExportStatus('failed');
                                    } else {
                                        setExportError(null);
                                        setExportStatus('failed');
                                    }
                                } catch (e) {
                                    setExportError(e && e.message ? e.message : String(e));
                                    setExportStatus('failed');
                                }
                                setTimeout(() => setExportStatus(null), 1700);
                                setTimeout(() => setExportError(null), 4000);
                            }}
                            title="Export a card image"
                            disabled={!allCompleted || generatedDisabled}
                            style={{ height: 40, minWidth: isMobile ? '100%' : 180, borderRadius: 8, border: '1px solid #e0e0e0', background: (!allCompleted || generatedDisabled) ? '#f5f5f5' : '#efefef', cursor: (!allCompleted || generatedDisabled) ? 'not-allowed' : 'pointer', padding: '0 12px', fontSize: 14, color: (!allCompleted || generatedDisabled) ? '#999' : '#111' }}
                        >
                            {showDetails ? 'Generate Guesses Image' : 'Generate Results TCG Card'}
                        </button>
                        <input
                            type="text"
                            maxLength={50}
                            value={cardName}
                            onChange={(e) => { setCardName(e.target.value.slice(0,50)); setGeneratedDisabled(false); }}
                            placeholder="Type your name here..."
                            aria-label="Card name"
                            style={{ height: 28, padding: '6px 8px', borderRadius: 8, border: '1px solid #e0e0e0', fontSize: 14, minWidth: 80, width: isMobile ? '95%' : undefined }}
                        />
                        {exportStatus === 'working' && <div style={{ color: '#666', fontSize: 13 }}>Generating</div>}
                        {exportStatus === 'copied' && <div style={{ color: '#1976d2', fontSize: 13 }}>Copied</div>}
                        {exportStatus === 'downloaded' && <div style={{ color: '#1976d2', fontSize: 13 }}>Downloaded</div>}
                        {exportStatus === 'failed' && (
                            <div style={{ color: '#b00020', fontSize: 13 }}>
                                {exportError ? `Export failed: ${exportError}` : 'Export failed'}
                            </div>
                        )}
                    </div>

                    {/* Desktop: show Download in header area; Mobile: it will appear under the preview */}
                    <div style={{ marginLeft: 'auto', display: isMobile ? 'none' : 'flex', gap: 8, alignItems: 'center' }}>
                        {cardPreviewUrl ? (
                            <button
                                onClick={() => {
                                    try {
                                        const a = document.createElement('a');
                                        a.href = cardPreviewUrl;
                                        const safeLabel = pokedleLabel.replace(/\s+/g, ' ');
                                        a.download = `${safeLabel}.png`;
                                        document.body.appendChild(a);
                                        a.click();
                                        a.remove();
                                    } catch (e) {
                                        // ignore
                                    }
                                }}
                                style={{ height: 40, minWidth: 120, borderRadius: 8, border: '1px solid #e0e0e0', background: '#efefef', cursor: 'pointer', padding: '0 12px', fontSize: 14, color: '#111' }}
                            >
                                Download
                            </button>
                        ) : null}
                    </div>
                </div>

                {/* Preview of generated card (if available) */}
                {cardPreviewUrl ? (
                    <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'flex-start', justifyContent: 'center', flexDirection: isMobile ? 'column' : 'row' }}>
                        <div style={{ border: '1px solid #eee', padding: 8, borderRadius: 6, background: '#fff' }}>
                            <img src={cardPreviewUrl} alt="Generated card preview" style={{ width: isMobile ? '100%' : 350, height: 'auto', display: 'block', borderRadius: 4 }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {/* On mobile show Download button under the preview */}
                            {isMobile && cardPreviewUrl ? (
                                <div>
                                    <button
                                        onClick={() => {
                                            try {
                                                const a = document.createElement('a');
                                                a.href = cardPreviewUrl;
                                                const safeLabel = pokedleLabel.replace(/\s+/g, ' ');
                                                a.download = `${safeLabel}.png`;
                                                document.body.appendChild(a);
                                                a.click();
                                                a.remove();
                                            } catch (e) {
                                                // ignore
                                            }
                                        }}
                                        style={{ height: 40, minWidth: 120, borderRadius: 8, border: '1px solid #e0e0e0', background: '#efefef', cursor: 'pointer', padding: '0 12px', fontSize: 14, color: '#111', width: '100%' }}
                                    >
                                        Download
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                ) : null}
            </div>
            {/* Previous days history (last 10) - moved to its own container */}
                {history && history.length > 0 ? (
                <div style={{ marginTop: 14, maxWidth: historyMax, marginLeft: 'auto', marginRight: 'auto', padding: 12, borderRadius: 6, background: '#fff', border: '1px solid #f0f0f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                        <div style={{ fontWeight: 700, textAlign: 'center' }}>Last 7 Days</div>
                    </div>
                    <div style={{ overflowX: 'auto' }} onTouchStart={onHistoryTouchStart} onTouchMove={onHistoryTouchMove} onWheel={onHistoryWheel}>
                        {(() => {
                            // Modes down the left, dates across the top
                            const modes = ['Classic', 'Card', 'Pokedex', 'Details', 'Colours', 'Locations'];
                            // Always show the most recent 7 days. If data is missing for a date, show an empty row.
                            const DAYS = 7;
                            const today = new Date();
                            const last7 = [];
                            for (let i = 0; i < DAYS; i++) {
                                const dt = new Date(today);
                                dt.setDate(today.getDate() - i);
                                const y = dt.getFullYear();
                                const m = String(dt.getMonth() + 1).padStart(2, '0');
                                const d = String(dt.getDate()).padStart(2, '0');
                                last7.push(`${y}${m}${d}`);
                            }
                            const displayedHistory = last7.map(dateKey => {
                                const found = history.find(h => String(h.date) === dateKey);
                                return found || { date: dateKey, results: [] };
                            });
                            const dates = displayedHistory.map(h => {
                                // h.date is YYYYMMDD - calculate Pokedle day number
                                const y = parseInt(String(h.date).slice(0,4), 10);
                                const mth = parseInt(String(h.date).slice(4,6), 10) - 1;
                                const dnum = parseInt(String(h.date).slice(6,8), 10);
                                const dt = new Date(y, mth, dnum);
                                
                                // Calculate Pokedle day number (same logic as at the top of the file)
                                const effectiveDate = effectiveUTCDate(dt);
                                const dayNum = Math.floor((effectiveDate.getTime() - epoch.getTime()) / MS_PER_DAY) + 1;
                                return `#${dayNum}`;
                            });

                            // First column for mode labels (narrower), then one column per date, then a Total column
                            // Use a reasonable min width for date columns so they remain readable on mobile
                            const gridCols = `61px repeat(${dates.length}, minmax(22px, 1fr)) 40px`;

                            // Precompute lookup map for quick access: dateIndex -> label -> value
                            const lookup = {};
                            displayedHistory.forEach((h, idx) => {
                                const map = {};
                                (h.results || []).forEach(r => {
                                    if (!r || !r.label) return;
                                    map[String(r.label).toLowerCase()] = (r.solved && typeof r.guessCount === 'number') ? r.guessCount : '-';
                                });
                                lookup[idx] = map;
                            });

                            // Helper: resolve a mode label against stored labels with flexible matching
                            const resolveModeValue = (map, mode) => {
                                if (!map) return '-';
                                const key = String(mode).toLowerCase();
                                if (Object.prototype.hasOwnProperty.call(map, key)) return map[key];
                                const keys = Object.keys(map);
                                for (const k of keys) {
                                    if (k.includes(key) || key.includes(k)) return map[k];
                                }
                                // No match found
                                return map[key] !== undefined ? map[key] : '-';
                            };

                            // compute totals per date (column) and overall total
                            const dateTotals = displayedHistory.map(h => {
                                return (h.results || []).reduce((acc, r) => acc + ((r.solved && typeof r.guessCount === 'number') ? r.guessCount : 0), 0);
                            });
                            const overallTotal = dateTotals.reduce((a, b) => a + b, 0);

                            return (
                                <div>
                                    {/* header row: empty cell then date columns then Total */}
                                    <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 5, alignItems: 'center', padding: '8px 6px', borderBottom: '1px solid #f6f6f6', fontSize: 13 }}>
                                        <div style={{ fontWeight: 700, textAlign: 'left', paddingLeft: 6 }}>Mode</div>
                                        {dates.map((dLabel, i) => (
                                            <div key={i} style={{ fontWeight: 700, textAlign: 'center' }}>{dLabel}</div>
                                        ))}
                                        <div style={{ fontWeight: 700, textAlign: 'right' }}>Total</div>
                                    </div>


                                    {/* mode rows */}
                                    {modes.map((mode, mi) => {
                                        // sum across dates for this mode
                                        let modeTotal = 0;
                                        let anyNumber = false;
                                        const cells = displayedHistory.map((h, hi) => {
                                            const map = lookup[hi] || {};
                                            const val = resolveModeValue(map, mode);
                                            if (typeof val === 'number') {
                                                modeTotal += val;
                                                anyNumber = true;
                                                return val;
                                            }
                                            return '-';
                                        });

                                        return (
                                            <div key={mi} style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 2, alignItems: 'center', padding: '8px 6px', borderBottom: mi !== modes.length - 1 ? '1px solid #fafafa' : 'none', fontSize: 13 }}>
                                                <div style={{ fontWeight: 500, textAlign: 'left', paddingLeft: 3 }}>{mode}</div>
                                                {cells.map((v, i) => (
                                                    <div key={i} style={{ textAlign: 'center' }}>{v}</div>
                                                ))}
                                                <div style={{ textAlign: 'right', fontWeight: 800 }}>{anyNumber ? modeTotal : '-'}</div>
                                            </div>
                                        );
                                    })}

                                    {/* totals row per date (moved to bottom) */}
                                    <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 4, alignItems: 'center', padding: '8px 6px', borderTop: '1px solid #eee', fontSize: 13, background: '#fbfbfb', marginTop: 6 }}>
                                        <div style={{ fontWeight: 700, textAlign: 'left', paddingLeft: 2 }}>Total</div>
                                        {dateTotals.map((dt, i) => (
                                            <div key={i} style={{ fontWeight: 800, textAlign: 'center' }}>{dt}</div>
                                        ))}
                                        <div style={{ fontWeight: 800, textAlign: 'right' }}>{overallTotal}</div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
