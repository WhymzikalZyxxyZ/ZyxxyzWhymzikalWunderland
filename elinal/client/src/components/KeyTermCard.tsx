import { termSlug } from '../utils/termSlug';

interface Props { term: string; }

export function KeyTermCard({ term }: Props) {
    return (
        <a href={`#${termSlug(term)}`} className="key-term" aria-label={`Jump to glossary: ${term}`}>
            {term}
        </a>
    );
}
