import { StrictMode } from 'react';
import { createRoot }  from 'react-dom/client';
import App             from './App';
import ErrorBoundary   from './components/ErrorBoundary';
import './index.css';

// Report uncaught promise rejections to Sentry when configured.
window.addEventListener('unhandledrejection', (e) => {
    const sentry = (window as Window & { Sentry?: { captureException: (e: unknown) => void } }).Sentry;
    sentry?.captureException?.(e.reason);
});

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </StrictMode>
);
