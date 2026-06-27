import { Routes, Route, Link } from 'react-router-dom';
import { OpinionList }         from './components/OpinionList';
import { ReadingView }         from './components/ReadingView';
import { usePostMessage }      from './hooks/usePostMessage';
import './App.css';

function NotFound() {
    return (
        <div className="not-found">
            <p className="not-found-code">404</p>
            <p className="not-found-msg">Nothing here.</p>
            <Link to="/" className="back-link">← Back to opinions</Link>
        </div>
    );
}

const isEmbedded = window.parent !== window;

function App() {
    usePostMessage();

    return (
        <>
            <a href="#main-content" className="skip-link">Skip to content</a>

            <header className={`app-header${isEmbedded ? ' app-header--embedded' : ''}`}>
                <Link to="/" aria-label="ELINAL home">
                    <span className="header-glyph" aria-hidden="true">🏛️</span>
                    <span>
                        <div className="header-title">ELINAL</div>
                        <div className="header-subtitle">Explain Like I'm Not A Lawyer</div>
                    </span>
                </Link>
            </header>

            <main id="main-content" className="app-main">
                <Routes>
                    <Route path="/"        element={<OpinionList />} />
                    <Route path="/:docket" element={<ReadingView />} />
                    <Route path="*"        element={<NotFound />} />
                </Routes>
            </main>

            <footer className="app-footer">
                Educational reading materials only. Not legal advice.{' '}
                ELINAL is not a substitute for qualified counsel.
            </footer>
        </>
    );
}

export default App;
