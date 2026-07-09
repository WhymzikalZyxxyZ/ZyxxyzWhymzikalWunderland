export type ProjectType   = 'novel' | 'short_story' | 'essay' | 'poetry' | 'novella';
export type ProjectStatus = 'concept' | 'drafting' | 'revising' | 'querying' | 'on_hold' | 'published';
export type PubType       = 'traditional' | 'self';

export interface User {
    userId: string; username: string; createdAt: string;
}

export interface Project {
    id: string; userId: string; seriesId: string | null; seriesNumber: number | null;
    title: string; type: ProjectType; genreId: string | null;
    status: ProjectStatus; blurb: string | null; summary: string | null;
    targetWordCount: number; totalWords: number;
    coverKey: string | null; mainCoverKey: string | null; altCoverKeys: string;
    pubType: PubType | null; createdAt: string; updatedAt: string;
}

export interface Chapter {
    id: string; projectId: string; userId: string;
    chapterNumber: number; title: string | null;
    content: string; wordCount: number;
    createdAt: string; updatedAt: string;
}

export interface ProjectStats {
    total: number; totalWords: number;
    concept: number; drafting: number; revising: number;
    querying: number; on_hold: number; published: number;
}

export interface Character {
    id: string; projectId: string; userId: string;
    name: string; age: string | null;
    physicalDescription: string | null; notes: string | null;
    sortOrder: number; createdAt: string; updatedAt: string;
}

export interface CharacterImage {
    id: string; characterId: string;
    storageKey: string; caption: string | null; sortOrder: number;
}

export interface Commission {
    id: string; projectId: string; userId: string; who: string;
    amountCents: number | null; description: string;
    deadline: string | null; done: boolean; createdAt: string;
}

export interface CompTitle {
    id: string; projectId: string;
    title: string; author: string; year: number | null; reason: string | null;
    createdAt: string;
}

export interface Publishing {
    id: string; projectId: string; userId: string;
    pubType: PubType; datePublished: string | null; isbn: string | null;
    publisherName: string | null; dealDetails: string | null;
    contractStorageKey: string | null; createdAt: string; updatedAt: string;
}

export interface PublishingSize {
    id: string; projectId: string; sizeLabel: string; format: string;
}

export interface Distribution {
    id: string; projectId: string; channel: string; label: string;
    url: string | null; inventory: number; onOrder: number; notes: string | null;
}

export interface ProjectEvent {
    id: string; projectId: string; userId: string;
    name: string; date: string | null; location: string | null; notes: string | null;
}

export interface ProjectArt {
    id: string; projectId: string; userId: string;
    storageKey: string; label: string | null; sortOrder: number;
}
