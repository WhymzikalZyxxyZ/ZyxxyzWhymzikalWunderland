interface Props { text: string; }

export function PullQuote({ text }: Props) {
    return (
        <blockquote className="pull-quote">
            <span className="pull-quote-mark" aria-hidden="true">"</span>
            {text}
        </blockquote>
    );
}
