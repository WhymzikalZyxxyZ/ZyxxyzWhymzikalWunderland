import { Routes, Route, Link } from 'react-router-dom';
import { OpinionList }         from './components/OpinionList';
import './App.css';

function App() {
    return (
        <>
            <header className="app-header">
                <Link to="/" aria-label="ELINAL home">
                    <span className="header-glyph" aria-hidden="true">🏛️</span>
                    <span>
                        <div className="header-title">ELINAL</div>
                        <div className="header-subtitle">Explain Like I'm Not A Lawyer</div>
                    </span>
                </Link>
            </header>

            <main className="app-main">
                <Routes>
                    <Route path="/" element={<OpinionList />} />
                    {/* Phase 6: ReadingView replaces this placeholder */}
                    <Route path="/:docket" element={<OpinionList />} />
                </Routes>
            </main>

            <footer className="app-footer">
                Educational reading materials only. Not legal advice.<br />
                ELINAL is not a substitute for qualified counsel.
            </footer>
        </>
    );
}

export default App;
