import type { GlossaryEntry } from '../types';

interface Props { entries: GlossaryEntry[]; }

export function GlossarySection({ entries }: Props) {
    if (entries.length === 0) return null;
    return (
        <section className="glossary" aria-labelledby="glossary-heading">
            <h2 id="glossary-heading" className="section-heading">Glossary</h2>
            <dl className="glossary-list">
                {entries.map(e => (
                    <div key={e.term} className="glossary-entry">
                        <dt className="glossary-term">{e.term}</dt>
                        <dd className="glossary-def">{e.definition}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}
