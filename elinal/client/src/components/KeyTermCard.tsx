interface Props { term: string; }

export function KeyTermCard({ term }: Props) {
    return <span className="key-term">{term}</span>;
}
