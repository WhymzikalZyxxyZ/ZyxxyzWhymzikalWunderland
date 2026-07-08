export function AppLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
    const cls = {
        sm: 'text-xl tracking-[0.25em]',
        md: 'text-3xl tracking-[0.3em]',
        lg: 'text-5xl tracking-[0.35em]',
    }[size];

    return (
        <span className={`font-display font-black uppercase select-none ${cls}`}>
            <span className="text-ep-text-dim">EPI</span>
            <span className="text-ep-amber font-black">TOME</span>
        </span>
    );
}
