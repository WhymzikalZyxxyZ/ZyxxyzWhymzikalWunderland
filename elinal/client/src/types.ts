export interface Opinion {
    docket:       string;
    term:         string;
    title:        string;
    decided_date: string | null;
    status:       'pending' | 'processing' | 'ready' | 'error';
    error_msg?:   string | null;
}

export interface Section {
    heading:    string;
    body:       string;
    key_terms:  string[];
    pull_quote: string;
}

export interface GlossaryEntry {
    term:       string;
    definition: string;
}

export interface FurtherReadingEntry {
    title:       string;
    description: string;
}

export interface ReadingMaterials {
    docket:               string;
    title:                string;
    decided_date:         string | null;
    sections:             Section[];
    glossary:             GlossaryEntry[];
    discussion_questions: string[];
    further_reading:      FurtherReadingEntry[];
}
