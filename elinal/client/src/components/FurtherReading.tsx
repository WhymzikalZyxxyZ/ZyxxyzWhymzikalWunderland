import type { FurtherReadingEntry } from '../types';

interface Props { entries: FurtherReadingEntry[]; }

export function FurtherReading({ entries }: Props) {
    if (entries.length === 0) return null;
    return (
        <section className="further-reading" aria-labelledby="further-heading">
            <h2 id="further-heading" className="section-heading">Further Reading</h2>
            <ul className="further-list">
                {entries.map((e, i) => (
                    <li key={i} className="further-item">
                        <strong className="further-title">{e.title}</strong>
                        <p className="further-desc">{e.description}</p>
                    </li>
                ))}
            </ul>
        </section>
    );
}
