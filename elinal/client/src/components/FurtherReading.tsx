import type { FurtherReadingEntry } from '../types';

interface Props { entries: FurtherReadingEntry[]; }

export function FurtherReading({ entries }: Props) {
    if (entries.length === 0) return null;
    return (
        <section className="further-reading" aria-labelledby="further-heading">
            <h2 id="further-heading" className="section-heading">Further Reading</h2>
            <p className="further-note">AI-suggested topics — each link searches for the title.</p>
            <ul className="further-list">
                {entries.map((e, i) => (
                    <li key={i} className="further-item">
                        <a
                            href={`https://duckduckgo.com/?q=${encodeURIComponent(e.title + ' law SCOTUS')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="further-title"
                        >
                            {e.title} <span className="further-link-icon" aria-hidden="true">↗</span>
                        </a>
                        <p className="further-desc">{e.description}</p>
                    </li>
                ))}
            </ul>
        </section>
    );
}
