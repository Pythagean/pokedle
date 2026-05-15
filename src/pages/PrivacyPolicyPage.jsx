import React from 'react';

const LAST_UPDATED = 'May 15, 2026';
const CONTACT_EMAIL = 'slowpokle.game@gmail.com';
const SITE_NAME = 'Pokédle';
const SITE_URL = 'https://pythagean.github.io/pokedle/';

function Section({ title, children }) {
    return (
        <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1976d2', margin: '0 0 10px' }}>{title}</h2>
            <div style={{ fontSize: 15, color: '#444', lineHeight: 1.7 }}>{children}</div>
        </div>
    );
}

export default function PrivacyPolicyPage({ onBack }) {
    return (
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '8px 4px 40px' }}>
            {/* Back button */}
            <button
                onClick={onBack}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'none',
                    border: 'none',
                    padding: '4px 0',
                    color: '#1976d2',
                    fontWeight: 600,
                    fontSize: 15,
                    cursor: 'pointer',
                    marginBottom: 20,
                }}
            >
                &#8592; Back
            </button>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1976d2', margin: '0 0 8px' }}>
                    Privacy Policy
                </h1>
                <p style={{ fontSize: 14, color: '#888', margin: 0 }}>Last updated: {LAST_UPDATED}</p>
            </div>

            <Section title="1. Introduction">
                <p style={{ margin: '0 0 10px' }}>
                    This Privacy Policy explains how {SITE_NAME} ("{SITE_URL}") collects, uses, and
                    protects information when you visit and use this website.
                </p>
                <p style={{ margin: 0 }}>
                    By using {SITE_NAME} you agree to the practices described in this policy.
                </p>
            </Section>

            <Section title="2. Information We Collect">
                <p style={{ margin: '0 0 10px' }}>
                    We do not collect personally identifiable information directly. However, the following
                    data may be collected through third-party services we use:
                </p>
                <ul style={{ margin: '0 0 10px', paddingLeft: 22 }}>
                    <li style={{ marginBottom: 6 }}>
                        <strong>Usage statistics</strong> — anonymous data about which pages you visit, how
                        long you spend on the site, your approximate geographic region, device type, and
                        browser type. This is collected via analytics cookies.
                    </li>
                    <li style={{ marginBottom: 6 }}>
                        <strong>Advertising data</strong> — if ads are displayed, ad networks may set their
                        own cookies to serve relevant advertisements and measure ad performance.
                    </li>
                    <li>
                        <strong>Local storage / session data</strong> — your daily game progress and
                        preferences (e.g. your chosen emoji for results) are saved locally in your browser
                        using <code>localStorage</code>. This data never leaves your device and is not
                        sent to any server.
                    </li>
                </ul>
            </Section>

            <Section title="3. Cookies">
                <p style={{ margin: '0 0 10px' }}>
                    Cookies are small text files placed on your device by websites you visit. {SITE_NAME} may
                    use the following categories of cookies:
                </p>
                <ul style={{ margin: 0, paddingLeft: 22 }}>
                    <li style={{ marginBottom: 6 }}>
                        <strong>Analytics cookies</strong> — help us understand how visitors interact with
                        the site (e.g. Google Analytics or similar). These cookies collect information
                        anonymously and report website trends without identifying individual visitors.
                    </li>
                    <li>
                        <strong>Advertising cookies</strong> — set by third-party ad networks to show
                        you relevant ads. These partners may use information about your visits to this and
                        other websites to provide targeted advertising.
                    </li>
                </ul>
                <p style={{ margin: '10px 0 0' }}>
                    You can control or disable cookies through your browser settings. Note that disabling
                    cookies may affect some functionality of the site.
                </p>
            </Section>

            <Section title="4. Third-Party Services">
                <p style={{ margin: '0 0 10px' }}>
                    We may use third-party services including but not limited to:
                </p>
                <ul style={{ margin: 0, paddingLeft: 22 }}>
                    <li style={{ marginBottom: 6 }}>
                        <strong>Google Analytics</strong> — for anonymous usage statistics.
                        See Google's{' '}
                        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer"
                            style={{ color: '#1976d2' }}>Privacy Policy</a>.
                    </li>
                    <li style={{ marginBottom: 6 }}>
                        <strong>Supabase</strong> — for storing daily leaderboard results. Only
                        voluntarily entered display names and game scores are stored; no account or
                        registration is required.
                    </li>
                    <li>
                        <strong>Ad networks</strong> — if advertising is enabled on the site, ad partners
                        operate under their own privacy policies.
                    </li>
                </ul>
            </Section>

            <Section title="5. Data Retention">
                <p style={{ margin: 0 }}>
                    Leaderboard entries stored in our database (display name + score) are retained
                    on a rolling daily basis. Local browser data (game progress, preferences) remains
                    on your device until you clear your browser's local storage.
                </p>
            </Section>

            <Section title="6. Children's Privacy">
                <p style={{ margin: 0 }}>
                    {SITE_NAME} is not directed at children under 13. We do not knowingly collect
                    personal information from children. If you believe a child has provided personal
                    information, please contact us and we will take steps to remove it.
                </p>
            </Section>

            <Section title="7. Disclaimer">
                <p style={{ margin: 0 }}>
                    {SITE_NAME} is a fan-made project and is not affiliated with, endorsed by, or
                    sponsored by Nintendo, Game Freak, or The Pokémon Company. All Pokémon names,
                    images, and related trademarks are the property of their respective owners.
                </p>
            </Section>

            <Section title="8. Changes to This Policy">
                <p style={{ margin: 0 }}>
                    We may update this Privacy Policy from time to time. Changes will be reflected by
                    updating the "Last updated" date at the top of this page.
                </p>
            </Section>

            <Section title="9. Contact">
                <p style={{ margin: 0 }}>
                    If you have any questions about this Privacy Policy, please contact us at{' '}
                    <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#1976d2', fontWeight: 600, textDecoration: 'none' }}>
                        {CONTACT_EMAIL}
                    </a>.
                </p>
            </Section>

            {/* Back button */}
            <button
                onClick={onBack}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'none',
                    border: 'none',
                    padding: '4px 0',
                    color: '#1976d2',
                    fontWeight: 600,
                    fontSize: 15,
                    cursor: 'pointer',
                    marginBottom: 20,
                }}
            >
                &#8592; Back
            </button>
        </div>
    );
}
