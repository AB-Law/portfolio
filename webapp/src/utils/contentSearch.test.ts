import { describe, expect, it } from 'vitest';
import type { SearchIndexItem } from './contentSearch';
import {
    buildSearchPreview,
    buildSearchText,
    filterSearchIndex,
    extractMarkdownHeadings,
    markdownToSearchText,
} from './contentSearch';

const createIndexEntry = (overrides: Partial<SearchIndexItem>): SearchIndexItem => {
    const title = overrides.title ?? 'Local pipeline walkthrough';
    const description = overrides.description ?? 'A practical look at reusable index and search behavior.';
    const tags = overrides.tags ?? ['architecture', 'typescript'];
    const tagsText = overrides.tagsText ?? tags.join(' ').toLowerCase();
    const headings = overrides.headings ?? ['Build and preview', 'Search behavior', 'Search indexing'];
    const headingsText = overrides.headingsText ?? headings.join(' ');
    const bodyText = overrides.bodyText ?? 'This post explains how headings and body content are combined for ranking.';
    const searchText = buildSearchText({
        title,
        description,
        tagsText,
        headingsText,
        bodyText,
    });
    const defaultPreview = overrides.defaultPreview ?? 'This post explains how headings and body content are combined.';

    return {
        title,
        description,
        tags,
        tagsText,
        headings,
        headingsText,
        bodyText,
        searchText,
        defaultPreview,
        ...overrides,
    };
};

describe('contentSearch utils', () => {
    it('extracts markdown headings', () => {
        expect(extractMarkdownHeadings(`
            # Title
            ## Architecture
            body...
            ### Search pipeline
        `)).toEqual(['Architecture', 'Search pipeline']);
    });

    it('strips markdown into searchable plain text', () => {
        const markdown = `
# Heading

This is a paragraph with a [link](https://example.com) and an image ![alt](img.png).

## Section

\`\`\`ts
const x = 1;
\`\`\`
`;

        expect(markdownToSearchText(markdown)).toBe('Heading This is a paragraph with a link and an image Section');
    });

    it('builds text snippets and ranks heading matches', () => {
        const items: SearchIndexItem[] = [
            createIndexEntry({
                title: 'PluckIt architecture notes',
                tags: ['architecture', 'ml'],
                headings: ['Pipeline composition', 'Runtime behavior'],
                headingsText: 'Pipeline composition Runtime behavior',
                bodyText: 'The app routes work and indexes content with both headings and body terms.',
            }),
            createIndexEntry({
                title: 'Legacy migration story',
                tags: ['graph'],
                headings: ['Dependency graph', 'Edge rewrites'],
                headingsText: 'Dependency graph Edge rewrites',
                bodyText: 'The project was converted from ad hoc patterns to a versioned graph.',
            }),
        ];

        const matches = filterSearchIndex({
            items,
            searchQuery: 'dependency',
            activeTag: 'All',
        });

        expect(matches).toHaveLength(1);
        expect(matches[0].title).toBe('Legacy migration story');
        expect(matches[0].searchScore).toBeGreaterThan(0);
        expect(matches[0].searchPreview).toContain('Dependency graph');
    });

    it('falls back to default preview when query is empty', () => {
        const item = createIndexEntry({
            defaultPreview: 'Prebuilt preview sentence.',
        });

        const [match] = filterSearchIndex({
            items: [item],
            searchQuery: '',
            activeTag: 'All',
        });

        expect(match.searchPreview).toBe('Prebuilt preview sentence.');
        expect(match.searchScore).toBe(0);
    });

    it('builds a snippet around query hit', () => {
        expect(buildSearchPreview(
            'The query should surface right around the matching phrase so that previews stay relevant.',
            'matching phrase',
            { maxLength: 90 }
        )).toContain('matching phrase');
    });
});

