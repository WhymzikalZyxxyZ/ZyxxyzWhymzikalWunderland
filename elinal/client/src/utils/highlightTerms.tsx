import type { ReactNode } from 'react';
import type { GlossaryEntry } from '../types';
import { GlossaryTooltip }    from '../components/GlossaryTooltip';

// Finds the first occurrence of each glossary term in `text` and wraps it in
// a GlossaryTooltip. `seen` tracks which terms have already been highlighted
// (pass a shared Set across paragraphs to highlight each term only once per section).
export function highlightTerms(
    text: string,
    glossary: GlossaryEntry[],
    seen: Set<string>,
): ReactNode[] {
    if (!glossary.length) return [text];

    // Sort longest-first so "due process" matches before "process"
    const candidates = glossary
        .filter(g => !seen.has(g.term.toLowerCase()))
        .sort((a, b) => b.term.length - a.term.length);

    if (!candidates.length) return [text];

    const escaped = candidates.map(g =>
        g.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    );
    const pattern = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');

    const nodes: ReactNode[] = [];
    let last = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
        const lc = match[0].toLowerCase();
        const entry = candidates.find(g => g.term.toLowerCase() === lc);

        if (!entry || seen.has(lc)) {
            // Term already shown — don't highlight again this section
            continue;
        }

        if (match.index > last) nodes.push(text.slice(last, match.index));

        seen.add(lc);
        nodes.push(
            <GlossaryTooltip key={`${lc}-${match.index}`} term={match[0]} definition={entry.definition} />,
        );
        last = pattern.lastIndex;
    }

    if (last < text.length) nodes.push(text.slice(last));
    return nodes;
}
