import { Routes, Route, Link } from 'react-router-dom';
import { OpinionList }         from './components/OpinionList';
import { ReadingView }         from './components/ReadingView';
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
                    <Route path="/:docket" element={<ReadingView />} />
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
