import { Link }          from 'react-router-dom';
import { BookOpen }       from 'lucide-react';
import { StatusBadge }    from './StatusBadge';
import { WordCountBar }   from './WordCountBar';
import type { Project }   from '@/lib/types';

const TYPE_LABELS: Record<string, string> = {
    novel:       'Novel',
    short_story: 'Short Story',
    essay:       'Essay',
    poetry:      'Poetry',
    novella:     'Novella',
};

interface Props {
    project:    Project;
    seriesName?: string;
    genreName?:  string;
}

export function ProjectCard({ project, seriesName, genreName }: Props) {
    const coverKey = project.mainCoverKey ?? project.coverKey;
    const coverUrl = coverKey ? `/api/files/${coverKey}` : null;

    return (
        <Link
            to={`/projects/${project.id}`}
            className="group flex items-stretch gap-4 bg-ep-surface border border-ep-border rounded-xl p-4 hover:border-ep-border-hi transition-all duration-200 hover:shadow-lg"
        >
            {/* Cover thumbnail */}
            <div className="w-16 flex-shrink-0">
                {coverUrl ? (
                    <img
                        src={coverUrl}
                        alt={project.title}
                        className="w-16 h-24 object-cover rounded-lg shadow-md"
                    />
                ) : (
                    <div className="w-16 h-24 rounded-lg bg-ep-border flex items-center justify-center">
                        <BookOpen size={20} className="text-ep-muted" />
                    </div>
                )}
            </div>

            {/* Meta */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-display font-bold text-ep-text text-lg leading-tight truncate group-hover:text-ep-rose transition-colors">
                        {project.title}
                    </h3>
                    <StatusBadge status={project.status} />
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-ep-muted mb-3">
                    {seriesName && (
                        <span>
                            {seriesName}
                            {project.seriesNumber ? ` · Book ${project.seriesNumber}` : ''}
                        </span>
                    )}
                    <span>{TYPE_LABELS[project.type] ?? project.type}</span>
                    {genreName && <span>{genreName}</span>}
                </div>

                {project.blurb && (
                    <p className="text-ep-text-dim text-xs line-clamp-2 mb-3 leading-relaxed">
                        {project.blurb}
                    </p>
                )}

                <WordCountBar
                    current={project.totalWords}
                    target={project.targetWordCount ?? 50000}
                    compact
                />
            </div>
        </Link>
    );
}
