interface Props { term: string; }

function termSlug(t: string) {
    return 'glossary-' + t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function KeyTermCard({ term }: Props) {
    return (
        <a href={`#${termSlug(term)}`} className="key-term" aria-label={`Jump to glossary: ${term}`}>
            {term}
        </a>
    );
}
