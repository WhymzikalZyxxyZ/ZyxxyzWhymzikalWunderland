import { Link } from 'react-router-dom';
import type { Opinion } from '../types';

interface Props { opinion: Opinion; }

const BADGE: Partial<Record<Opinion['status'], { label: string; cls: string }>> = {
    pending:    { label: 'Pending',    cls: 'badge-pending' },
    processing: { label: 'Preparing', cls: 'badge-processing' },
    error:      { label: 'Error',     cls: 'badge-error' },
};

const HINT: Partial<Record<Opinion['status'], string>> = {
    pending:    'Queued for processing — check back soon.',
    processing: 'Reading materials are being prepared.',
    error:      'Processing failed — will be reprocessed on next manual ingest.',
};

export function OpinionCard({ opinion }: Props) {
    const date = opinion.decided_date
        ? new Date(opinion.decided_date + 'T12:00:00').toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric',
          })
        : null;
    const badge = BADGE[opinion.status];
    const hint  = HINT[opinion.status];

    return (
        <li>
            <Link to={`/${encodeURIComponent(opinion.docket)}`} className="opinion-card">
                <div className="card-meta">
                    <div className="card-docket">{opinion.docket}</div>
                    {badge && (
                        <span className={`card-badge ${badge.cls}`} aria-label={`Status: ${badge.label}`}>
                            {badge.label}
                        </span>
                    )}
                </div>
                <h2 className="card-title">{opinion.title}</h2>
                {date && <time className="card-date" dateTime={opinion.decided_date ?? ''}>{date}</time>}
                {hint && <p className="card-hint">{hint}</p>}
            </Link>
        </li>
    );
}
