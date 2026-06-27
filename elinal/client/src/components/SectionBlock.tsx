import type { Section } from '../types';
import { KeyTermCard } from './KeyTermCard';
import { PullQuote }   from './PullQuote';

interface Props { section: Section; index: number; }

export function SectionBlock({ section, index }: Props) {
    const paragraphs = section.body.split(/\n\n+/).filter(Boolean);

    return (
        <article className="section-block" id={`section-${index}`}>
            <h2 className="section-heading">{section.heading}</h2>

            <div className="section-body">
                {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
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
