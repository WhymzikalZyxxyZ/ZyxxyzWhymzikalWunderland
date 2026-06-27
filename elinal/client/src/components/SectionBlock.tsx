import type { GlossaryEntry, Section } from '../types';
import { highlightTerms }              from '../utils/highlightTerms';
import { KeyTermCard }                 from './KeyTermCard';
import { PullQuote }                   from './PullQuote';

interface Props {
    section:  Section;
    index:    number;
    glossary: GlossaryEntry[];
}

export function SectionBlock({ section, index, glossary }: Props) {
    const paragraphs = section.body.split(/\n\n+/).filter(Boolean);

    // Each section gets its own seen-set so the same term can be highlighted
    // once per section (rather than never appearing again after section 1).
    const seen = new Set<string>();

    return (
        <article className="section-block" id={`section-${index}`}>
            <h2 className="section-heading">{section.heading}</h2>

            <div className="section-body">
                {paragraphs.map((p, i) => (
                    <p key={i}>{highlightTerms(p, glossary, seen)}</p>
                ))}
            </div>

            {section.pull_quote && <PullQuote text={section.pull_quote} />}

            {(section.key_terms?.length ?? 0) > 0 && (
                <div className="key-terms" aria-label="Key terms">
                    {section.key_terms.map(t => <KeyTermCard key={t} term={t} />)}
                </div>
            )}
        </article>
    );
}
