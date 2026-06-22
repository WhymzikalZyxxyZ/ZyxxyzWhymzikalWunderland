import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props  { children: ReactNode; fallback?: ReactNode; }
interface State  { error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        // Report to Sentry when the DSN is configured at runtime.
        // The Sentry SDK is loaded from the environment; no hard dep required.
        const sentry = (window as Window & { Sentry?: { captureException: (e: unknown, ctx?: unknown) => void } }).Sentry;
        if (sentry?.captureException) {
            sentry.captureException(error, { extra: { componentStack: info.componentStack } });
        }
        console.error('[ErrorBoundary]', error, info.componentStack);
    }

    reset = () => this.setState({ error: null });

    render() {
        if (this.state.error) {
            if (this.props.fallback) return this.props.fallback;
            return (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', height: '100vh', gap: '1rem',
                    background: '#0d0d14', color: '#c07fe0', fontFamily: 'monospace',
                }}>
                    <h2 style={{ margin: 0 }}>Something went sideways.</h2>
                    <p style={{ color: '#aaa', margin: 0, maxWidth: 420, textAlign: 'center' }}>
                        {this.state.error.message || 'An unexpected error occurred.'}
                    </p>
                    <button
                        onClick={this.reset}
                        style={{
                            marginTop: '0.5rem', padding: '0.5rem 1.5rem',
                            background: 'transparent', border: '1px solid #c07fe0',
                            color: '#c07fe0', borderRadius: 4, cursor: 'pointer',
                            fontFamily: 'monospace', fontSize: '0.9rem',
                        }}
                    >
                        Try again
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
