import { useEffect, useState } from 'react';
import type { Section } from '../types';

interface Props { sections: Section[]; }

export function TableOfContents({ sections }: Props) {
    const [activeIdx, setActiveIdx] = useState<number | null>(null);

    useEffect(() => {
        const els = sections
            .map((_, i) => document.getElementById(`section-${i}`))
            .filter((el): el is HTMLElement => el !== null);

        if (els.length === 0) return;

        const io = new IntersectionObserver(
            entries => {
                const visible = entries
                    .filter(e => e.isIntersecting)
                    .map(e => Number(e.target.id.replace('section-', '')));
                if (visible.length > 0) setActiveIdx(Math.min(...visible));
            },
            // Trigger when a section enters the top 40% of the viewport
            { rootMargin: '-8% 0px -55% 0px', threshold: 0 },
        );

        els.forEach(el => io.observe(el));
        return () => io.disconnect();
    }, [sections]);

    return (
        <nav className="toc" aria-label="Table of contents">
            <h3 className="toc-heading">Contents</h3>
            <ol className="toc-list">
                {sections.map((s, i) => (
                    <li key={i}>
                        <a
                            href={`#section-${i}`}
                            className={`toc-link${activeIdx === i ? ' toc-link--active' : ''}`}
                            aria-current={activeIdx === i ? 'location' : undefined}
                        >
                            {s.heading}
                        </a>
                    </li>
                ))}
            </ol>
        </nav>
    );
}
