export type Bindings = {
    DB:          D1Database;
    STORAGE:     KVNamespace;
    AI:          Ai;
    ASSETS:      Fetcher;
    ENVIRONMENT: string;
    SITE_ORIGIN: string;
};

export type Variables = {
    userId: string;
};

export type ProjectType      = 'novel' | 'short_story' | 'essay' | 'poetry' | 'novella';
export type ProjectStatus    = 'concept' | 'drafting' | 'revising' | 'querying' | 'on_hold' | 'published';
export type PubType          = 'traditional' | 'self';
export type ManufacturerType = 'printer' | 'distributor' | 'manufacturer';
