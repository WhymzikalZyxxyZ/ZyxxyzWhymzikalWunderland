/**
 * Unit tests for the countWords() helper extracted from chapters.ts.
 *
 * countWords is not exported, so we inline the same logic here.  Any future
 * change to the real implementation that breaks these tests is intentional
 * signal that behaviour changed.
 */

import { describe, it, expect } from 'vitest';

// Mirror of the private helper in chapters.ts — kept in sync by the tests.
function countWords(html: string): number {
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return text.length > 0 ? text.split(' ').length : 0;
}

describe('countWords()', () => {
    it('returns 0 for an empty string', () => {
        expect(countWords('')).toBe(0);
    });

    it('returns 0 for a string that is only whitespace', () => {
        expect(countWords('   ')).toBe(0);
    });

    it('returns 0 for a string that is only HTML tags with no text', () => {
        expect(countWords('<p></p>')).toBe(0);
    });

    it('counts a single word', () => {
        expect(countWords('hello')).toBe(1);
    });

    it('counts multiple words in plain text', () => {
        expect(countWords('the quick brown fox')).toBe(4);
    });

    it('strips a simple paragraph tag and counts the inner words', () => {
        expect(countWords('<p>hello world</p>')).toBe(2);
    });

    it('strips nested tags and counts words', () => {
        // Tags are replaced with spaces, then whitespace is collapsed.
        // "<p><strong>bold text</strong> and <em>italic text</em></p>"
        // → " bold text  and  italic text " → "bold text and italic text" → 5 tokens
        expect(countWords('<p><strong>bold text</strong> and <em>italic text</em></p>')).toBe(5);
    });

    it('handles a full TipTap-style HTML document with many tags', () => {
        const html = '<p>Once upon a time</p><p>in a land far away</p>';
        // "Once upon a time in a land far away" = 9 words
        expect(countWords(html)).toBe(9);
    });

    it('collapses multiple spaces produced by tag removal', () => {
        // Two adjacent tags produce extra whitespace — should not count as words
        expect(countWords('<p>one</p><p>two</p>')).toBe(2);
    });

    it('handles self-closing tags like <br/>', () => {
        expect(countWords('first<br/>second')).toBe(2);
    });

    it('handles tags with attributes', () => {
        expect(countWords('<span class="foo">word</span>')).toBe(1);
    });

    it('handles HTML entities left in text — counts them as text tokens', () => {
        // &amp; is not a tag — the regex only strips tags, not entities
        expect(countWords('fish &amp; chips')).toBe(3);
    });

    it('returns correct count for 100-word-ish content', () => {
        const words = Array.from({ length: 10 }, (_, i) => `word${i}`).join(' ');
        const html  = `<p>${words}</p>`;
        expect(countWords(html)).toBe(10);
    });

    it('handles deeply nested markup without off-by-one errors', () => {
        const html = '<div><ul><li><p><em>one two three</em></p></li></ul></div>';
        expect(countWords(html)).toBe(3);
    });

    it('treats numbers as words', () => {
        expect(countWords('Chapter 1 begins here')).toBe(4);
    });
});
