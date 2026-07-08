import type { ProjectStatus } from '@/lib/types';

const LABELS: Record<ProjectStatus, string> = {
    published:   'Published',
    in_progress: 'In Progress',
    concept:     'Concept',
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
    return (
        <span className={`badge-${status} inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
            {LABELS[status]}
        </span>
    );
}
