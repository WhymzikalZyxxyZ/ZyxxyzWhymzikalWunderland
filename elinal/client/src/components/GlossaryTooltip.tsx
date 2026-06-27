import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

interface Props { term: string; definition: string; }

export function GlossaryTooltip({ term, definition }: Props) {
    const [open,    setOpen]    = useState(false);
    const [offsetX, setOffsetX] = useState(0);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cardRef    = useRef<HTMLSpanElement>(null);
    const tooltipId  = useId();

    useEffect(() => {
        return () => { if (closeTimer.current) clearTimeout(closeTimer.current); };
    }, []);

    // Clamp tooltip horizontally so it never clips outside the viewport
    useLayoutEffect(() => {
        if (!open || !cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const vw   = window.innerWidth;
        const pad  = 12;
        let dx = 0;
        if (rect.left  < pad)      dx = pad - rect.left;
        if (rect.right > vw - pad) dx = (vw - pad) - rect.right;
        setOffsetX(dx);
    }, [open]);

    function show() {
        if (closeTimer.current) clearTimeout(closeTimer.current);
        setOpen(true);
    }

    function hide() {
        closeTimer.current = setTimeout(() => setOpen(false), 120);
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open ? hide() : show(); }
        if (e.key === 'Escape') { setOpen(false); }
    }

    // When the card is shifted horizontally to avoid clipping, the caret must
    // shift the opposite direction so it stays visually above the anchor word.
    const tooltipStyle = offsetX !== 0
        ? {
              transform:          `translateX(calc(-50% + ${offsetX}px))`,
              '--gtooltip-caret': `calc(50% - ${offsetX}px)`,
          } as React.CSSProperties
        : undefined;

    return (
        <span
            className="gtooltip-anchor"
            onMouseEnter={show}
            onMouseLeave={hide}
            onFocus={show}
            onBlur={hide}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="button"
            aria-label={`Definition of ${term}`}
            aria-expanded={open}
            aria-describedby={open ? tooltipId : undefined}
        >
            {term}
            {open && (
                <span
                    id={tooltipId}
                    ref={cardRef}
                    className="gtooltip-card"
                    role="tooltip"
                    style={tooltipStyle}
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
