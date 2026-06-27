import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

type ElinelOutbound =
    | { type: 'elinal:ready' }
    | { type: 'elinal:view'; docket: string; title: string };

export function postToParent(msg: ElinelOutbound) {
    if (window.parent !== window) {
        window.parent.postMessage(msg, 'https://zyxwonderland.xyz');
    }
}

function isTrustedOrigin(origin: string) {
    return origin === 'https://zyxwonderland.xyz'
        || origin.endsWith('.zyxwonderland.xyz');
}

export function usePostMessage() {
    const navigate = useNavigate();

    useEffect(() => {
        postToParent({ type: 'elinal:ready' });

        function onMessage(ev: MessageEvent) {
            if (!isTrustedOrigin(ev.origin)) return;
            if (ev.data?.type === 'elinal:navigate' && typeof ev.data?.docket === 'string') {
                navigate(`/${encodeURIComponent(ev.data.docket)}`);
            }
            if (ev.data?.type === 'elinal:home') {
                navigate('/');
            }
        }

        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [navigate]);
}
