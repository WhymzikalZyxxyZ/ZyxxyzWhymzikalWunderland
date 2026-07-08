export type ProjectType   = 'novel' | 'short_story' | 'essay' | 'poetry' | 'novella';
export type ProjectStatus = 'concept' | 'drafting' | 'revising' | 'querying' | 'on_hold' | 'published';
export type PubType       = 'traditional' | 'self';

export interface User {
    userId:    string;
    username:  string;
    createdAt: string;
}

export interface Project {
    id: string; userId: string; seriesId: string | null; seriesNumber: number | null;
    title: string; type: ProjectType; genreId: string | null;
    status: ProjectStatus; blurb: string | null; summary: string | null;
    targetWordCount: number; totalWords: number;
    coverKey: string | null; altCoverKeys: string; pubType: PubType | null;
    createdAt: string; updatedAt: string;
}

export interface Page {
    id: string; projectId: string; userId: string;
    pageDate: string; title: string | null;
    content: string; wordCount: number;
    createdAt: string; updatedAt: string;
}

export interface ProjectStats {
    total: number; totalWords: number;
    concept: number; drafting: number; revising: number;
    querying: number; on_hold: number; published: number;
}

export interface Character {
    id: string; projectId: string; name: string; age: string | null;
    physicalDescription: string | null; notes: string | null;
    sortOrder: number; createdAt: string; updatedAt: string;
}

export interface Commission {
    id: string; projectId: string; who: string;
    amountCents: number | null; description: string;
    deadline: string | null; done: boolean; createdAt: string;
}
