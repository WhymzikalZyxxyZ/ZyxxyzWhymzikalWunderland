import { useState } from 'react';

export default function ShareButton() {
    const [copied, setCopied] = useState(false);

    const handleShare = async () => {
        const url = window.location.href;
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(url);
            } else {
                /* v8 ignore next 8 */
                const ta = document.createElement('textarea');
                ta.value = url;
                ta.style.cssText = 'position:fixed;top:-9999px';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* ignore — copy unavailable */ }
    };

    return (
        <button className="share-btn" onClick={handleShare} title="Copy link to current view">
            {copied ? '✓ Copied!' : '🔗 Share View'}
        </button>
    );
}
