import { useState, useEffect } from 'react';

const STORAGE_KEY = 'locator-banner-dismissed';

export default function BannerStrip() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    }, []);

    const dismiss = () => {
        localStorage.setItem(STORAGE_KEY, '1');
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="banner-strip" role="note" aria-label="Data coverage notice">
            <span className="banner-icon">📊</span>
            <p className="banner-text">
                <strong className="banner-headline">We know a great deal — and every great explorer knows their edges.</strong>
                {' '}US coverage only. Population and city-limit data speak through Census ACS 5-year estimates
                (2009–2022) and require a Census API key to reveal themselves fully. Walkability and Superfund
                layers are EPA-sourced and may occasionally play hard to get. Rural and unincorporated areas
                may leave you wanting more.
            </p>
            <button className="banner-dismiss" onClick={dismiss} aria-label="Dismiss notice">✕</button>
        </div>
    );
}
