import { useRef, useState } from 'react';

interface Props { term: string; definition: string; }

export function GlossaryTooltip({ term, definition }: Props) {
    const [open, setOpen] = useState(false);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    function show() {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        setOpen(true);
    }

    function hide() {
        closeTimer.current = setTimeout(() => setOpen(false), 120);
    }

    return (
        <span
            className="gtooltip-anchor"
            onMouseEnter={show}
            onMouseLeave={hide}
            onFocus={show}
            onBlur={hide}
            tabIndex={0}
            role="button"
            aria-label={`Definition of ${term}`}
            aria-expanded={open}
        >
            {term}
            {open && (
                <span
                    className="gtooltip-card"
                    role="tooltip"
                    onMouseEnter={show}
                    onMouseLeave={hide}
                >
                    <span className="gtooltip-term">{term}</span>
                    <span className="gtooltip-def">{definition}</span>
                </span>
            )}
        </span>
    );
}
