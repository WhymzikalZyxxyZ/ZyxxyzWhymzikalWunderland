export function termSlug(t: string): string {
    return 'glossary-' + t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
