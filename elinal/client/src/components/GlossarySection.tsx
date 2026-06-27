import type { GlossaryEntry } from '../types';

interface Props { entries: GlossaryEntry[]; }

export function termSlug(t: string) {
    return 'glossary-' + t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function GlossarySection({ entries }: Props) {
    if (entries.length === 0) return null;
    return (
        <section className="glossary" aria-labelledby="glossary-heading">
            <h2 id="glossary-heading" className="section-heading">
                Legal Terms <span className="section-count">({entries.length})</span>
            </h2>
            <dl className="glossary-list">
                {entries.map(e => (
                    <div key={e.term} id={termSlug(e.term)} className="glossary-entry">
                        <dt className="glossary-term">{e.term}</dt>
                        <dd className="glossary-def">{e.definition}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}
