function fmt(n: number) {
    return n.toLocaleString();
}

interface Props {
    current: number;
    target:  number;
    showNumbers?: boolean;
    compact?: boolean;
}

export function WordCountBar({ current, target, showNumbers = true, compact = false }: Props) {
    const pct  = target > 0 ? Math.min((current / target) * 100, 100) : 0;
    const over = current > target;

    return (
        <div className={compact ? 'flex items-center gap-2' : ''}>
            {showNumbers && (
                <div className={`flex justify-between text-xs mb-1 ${compact ? 'hidden' : ''}`}>
                    <span className="text-ep-text font-medium">{fmt(current)}</span>
                    <span className="text-ep-muted">/ {fmt(target)}</span>
                </div>
            )}
            {compact && (
                <span className="text-xs text-ep-muted whitespace-nowrap">
                    {fmt(current)}<span className="opacity-50">/{fmt(target)}</span>
                </span>
            )}
            <div className={`wc-bar ${compact ? 'w-24' : 'w-full'}`}>
                <div
                    className={`wc-bar-fill ${over ? 'over' : ''}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}
