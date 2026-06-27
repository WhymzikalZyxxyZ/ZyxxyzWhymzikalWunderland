import { Link } from 'react-router-dom';
import type { Opinion } from '../types';

interface Props { opinion: Opinion; }

export function OpinionCard({ opinion }: Props) {
    const date = opinion.decided_date
        ? new Date(opinion.decided_date).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric',
          })
        : null;

    return (
        <li>
            <Link to={`/${encodeURIComponent(opinion.docket)}`} className="opinion-card">
                <div className="card-docket">{opinion.docket}</div>
                <h2 className="card-title">{opinion.title}</h2>
                {date && <time className="card-date" dateTime={opinion.decided_date ?? ''}>{date}</time>}
            </Link>
        </li>
    );
}
