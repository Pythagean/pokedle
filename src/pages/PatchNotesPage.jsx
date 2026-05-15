import React, { useMemo } from 'react';
import patchNotesRaw from '../../PATCH_NOTES.md?raw';

/**
 * Parses PATCH_NOTES.md into an array of release objects:
 * { date, items: [{ mode, bullets: string[] }] }
 * Commit log blocks (```text ... ```) are stripped.
 */
function parsePatchNotes(raw) {
  // Remove commit log code blocks
  const stripped = raw.replace(/```text[\s\S]*?```/g, '').replace(/```[\s\S]*?```/g, '');

  // Split into per-release sections on "## Release Notes"
  const sections = stripped.split(/^## Release Notes/m).filter(s => s.trim());

  return sections.map(section => {
    const lines = section.split('\n');
    const dateLine = lines[0].replace(/^[\s—–-]+/, '').trim();

    // Collect bullet groups under "## What's New"
    const items = [];
    let currentMode = null;
    let inWhatNew = false;

    for (const rawLine of lines.slice(1)) {
      const line = rawLine.trimEnd();

      if (/^## What.s New/i.test(line)) { inWhatNew = true; continue; }
      if (/^##/.test(line)) { inWhatNew = false; continue; }
      if (!inWhatNew) continue;

      // Top-level mode bullet: "- **Mode** ..."
      const modeMatch = line.match(/^- \*\*(.+?)\*\*(.*)/);
      if (modeMatch) {
        currentMode = { mode: modeMatch[1].trim(), bullets: [] };
        // Inline text after the bold label (excluding <br>)
        const inline = modeMatch[2].replace(/<br\s*\/?>/gi, '').trim();
        if (inline && inline !== '-') currentMode.bullets.push(inline);
        items.push(currentMode);
        continue;
      }

      // Sub-bullet under current mode
      const subMatch = line.match(/^\s{2,}- (.+)/);
      if (subMatch && currentMode) {
        currentMode.bullets.push(subMatch[1].replace(/<br\s*\/?>/gi, '').trim());
        continue;
      }

      // Lone top-level bullet with no bold label
      const looseMatch = line.match(/^- (.+)/);
      if (looseMatch && !currentMode) {
        items.push({ mode: null, bullets: [looseMatch[1].replace(/<br\s*\/?>/gi, '').trim()] });
      }
    }

    return { date: dateLine, items: items.filter(i => i.bullets.length > 0) };
  }).filter(r => r.date);
}

/** Render inline markdown: **bold** and *italic* */
function InlineText({ text }) {
  const parts = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) parts.push(<strong key={m.index}>{m[1]}</strong>);
    else parts.push(<em key={m.index}>{m[2]}</em>);
    last = re.lastIndex;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}

export default function PatchNotesPage() {
  const releases = useMemo(() => parsePatchNotes(patchNotesRaw), []);

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 16px 48px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: 24 }}>Patch Notes</h2>

      {releases.map((release, ri) => (
        <div
          key={ri}
          style={{
            marginBottom: 24,
            background: '#f5f5f5',
            border: '1px solid #ddd',
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          {/* Release header */}
          <div style={{
            background: '#1976d2',
            color: '#fff',
            padding: '10px 18px',
            fontWeight: 700,
            fontSize: 16,
          }}>
            📋 {release.date}
          </div>

          {/* Mode sections */}
          <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {release.items.map((item, ii) => (
              <div key={ii}>
                {item.mode && (
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#1976d2', marginBottom: 4 }}>
                    {item.mode}
                  </div>
                )}
                <ul style={{ margin: 0, paddingLeft: item.mode ? 18 : 0, listStyle: item.mode ? 'disc' : 'none' }}>
                  {item.bullets.map((b, bi) => (
                    <li key={bi} style={{ fontSize: 14, color: '#333', marginBottom: 2 }}>
                      <InlineText text={b} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {release.items.length === 0 && (
              <span style={{ color: '#888', fontSize: 13 }}>No notes recorded.</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
