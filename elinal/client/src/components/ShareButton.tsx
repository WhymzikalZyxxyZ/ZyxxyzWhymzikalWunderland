import { useState } from 'react';

interface Props { title: string; }

export function ShareButton({ title }: Props) {
    const [state, setState] = useState<'idle' | 'copied' | 'shared'>('idle');

    async function handleShare() {
        const url = window.location.href;

        if (navigator.share) {
            try {
                await navigator.share({ title: `${title} — ELINAL`, url });
                setState('shared');
                setTimeout(() => setState('idle'), 2000);
                return;
            } catch {
                // User cancelled native share — fall through to clipboard
            }
        }

        try {
            await navigator.clipboard.writeText(url);
            setState('copied');
            setTimeout(() => setState('idle'), 2000);
        } catch {
            // Clipboard unavailable (non-HTTPS, permissions) — open system share as last resort
            prompt('Copy this link:', url);
        }
    }

    const label = state === 'copied' ? '✓ Link copied'
                : state === 'shared' ? '✓ Shared'
                : 'Share';

    return (
        <button
            className={`share-btn ${state !== 'idle' ? 'share-btn--done' : ''}`}
            onClick={handleShare}
            aria-live="polite"
            aria-label="Share a link to this opinion"
        >
            {label}
        </button>
    );
}
