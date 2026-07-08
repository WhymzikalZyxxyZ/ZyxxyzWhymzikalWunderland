import type { ProjectStatus } from '@/lib/types';

const LABELS: Record<ProjectStatus, string> = {
    concept:   'Concept',
    drafting:  'Drafting',
    revising:  'Revising',
    querying:  'Querying',
    on_hold:   'On Hold',
    published: 'Published',
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
    return (
        <span className={`badge badge-${status}`}>
            {LABELS[status]}
        </span>
    );
}
