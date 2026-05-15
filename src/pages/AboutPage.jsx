import React from 'react';

const MODES = [
    { key: 'classic',   label: 'Classic',     desc: 'Guess the Pokémon from its types, generation, height, weight, habitat.' },
    { key: 'card',      label: 'Card',        desc: 'Guess the Pokémon from its TCG (or TCG Pocket) card art!' },
    { key: 'pokedex',   label: 'Pokédex',     desc: 'Guess the Pokémon from its Pokédex entries.' },
    { key: 'details',   label: 'Details',     desc: 'Guess the Pokémon from a zoomed in or silhouetted image.' },
    { key: 'colours',   label: 'Colours',     desc: 'Guess the Pokémon from its colours.' },
    { key: 'map',       label: 'Locations',   desc: 'Guess the Pokémon from its footprint and in-game Locations.' },
];

export default function AboutPage({ onPrivacyClick }) {
    return (
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '8px 4px 40px' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1976d2', margin: '0 0 10px' }}>
                    About Pokédle
                </h1>
                <p style={{ fontSize: 16, color: '#444', lineHeight: 1.6, margin: 0 }}>
                    Pokédle is a daily Pokémon guessing game featuring <strong>6 different modes</strong>, each
                    offering a unique way to test your Pokémon knowledge. A new Pokémon is chosen for each mode
                    every day!
                </p>
            </div>

            {/* Inspiration */}
            <div style={{
                background: '#f0f6ff',
                border: '1.5px solid #c5d8f7',
                borderRadius: 12,
                padding: '14px 18px',
                marginBottom: 28,
                fontSize: 15,
                color: '#444',
                lineHeight: 1.6,
            }}>
                Inspired by{' '}
                <a
                    href="https://pokedle.net/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#1976d2', fontWeight: 600, textDecoration: 'none' }}
                >
                    pokedle.net
                </a>
                {' '} - check it out too!
            </div>

            {/* Modes */}
            <h2 style={{ fontSize: 19, fontWeight: 700, color: '#1976d2', margin: '0 0 14px' }}>
                Game Modes
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 36 }}>
                {MODES.map(m => (
                    <div key={m.key} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 14,
                        background: '#fff',
                        border: '1.5px solid #e0e7ef',
                        borderRadius: 10,
                        padding: '12px 16px',
                    }}>
                        <img
                            src={`icons/${m.key}.png`}
                            alt=""
                            style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0, marginTop: 2 }}
                        />
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 15, color: '#1976d2', marginBottom: 3 }}>
                                {m.label}
                            </div>
                            <div style={{ fontSize: 14, color: '#555', lineHeight: 1.55 }}>
                                {m.desc}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Feedback */}
            <h2 style={{ fontSize: 19, fontWeight: 700, color: '#1976d2', margin: '0 0 10px' }}>
                Feedback
            </h2>
            <div style={{
                background: '#fff',
                border: '1.5px solid #e0e7ef',
                borderRadius: 10,
                padding: '14px 18px',
                fontSize: 15,
                color: '#444',
                lineHeight: 1.6,
            }}>
                Got a suggestion, found a bug, or just want to say hi? Feel free to reach out at{' '}
                <a
                    href="mailto:slowpokle.game@gmail.com"
                    style={{ color: '#1976d2', fontWeight: 600, textDecoration: 'none' }}
                >
                    slowpokle.game@gmail.com
                </a>
            </div>

            {/* Disclaimer */}
            <div style={{
                marginTop: 28,
                fontSize: 13,
                color: '#888',
                lineHeight: 1.6,
                textAlign: 'center',
            }}>
                Nintendo does not endorse or sponsor this project.
            </div>

            {/* Cookie / Privacy notice */}
            <div style={{
                marginTop: 12,
                fontSize: 13,
                color: '#888',
                lineHeight: 1.6,
                textAlign: 'center',
            }}>
                This website uses cookies to collect statistics and show ads.{' '}
                <button
                    onClick={onPrivacyClick}
                    style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: '#1976d2',
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                    }}
                >
                    Privacy Policy
                </button>
            </div>
        </div>
    );
}
