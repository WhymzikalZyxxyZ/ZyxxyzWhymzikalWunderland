import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props  { children: ReactNode; }
interface State  { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[ELINAL] Uncaught render error:', error, info.componentStack);
    }

    reset = () => this.setState({ error: null });

    render() {
        const { error } = this.state;
        if (error) {
            return (
                <div className="error-boundary" role="alert">
                    <div className="error-boundary-icon" aria-hidden="true">⚖️</div>
                    <h2 className="error-boundary-title">Something went wrong</h2>
                    <p className="error-boundary-msg">{error.message}</p>
                    <div className="error-boundary-actions">
                        <button
                            className="retry-btn"
                            type="button"
                            onClick={this.reset}
                        >
                            ↺ Try again
                        </button>
                        {/* Use <a> not <Link> — error may have originated inside the Router */}
                        <a href="/" className="back-link">← All opinions</a>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
