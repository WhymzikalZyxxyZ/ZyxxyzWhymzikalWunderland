import type { Section } from '../types';

interface Props { sections: Section[]; }

export function TableOfContents({ sections }: Props) {
    return (
        <nav className="toc" aria-label="Table of contents">
            <h3 className="toc-heading">Contents</h3>
            <ol className="toc-list">
                {sections.map((s, i) => (
                    <li key={i}>
                        <a href={`#section-${i}`} className="toc-link">{s.heading}</a>
                    </li>
                ))}
            </ol>
        </nav>
    );
}
