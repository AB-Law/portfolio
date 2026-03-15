import { describe, expect, it } from 'vitest';
import { filterBySearchAndTag, getTagFromQuery, getValidViewMode } from './filtering';

type TestItem = {
    title: string;
    description: string;
    tags: string[];
};

const items: TestItem[] = [
    {
        title: 'Serverless AI',
        description: 'Orchestrating remote model pipelines.',
        tags: ['azure', 'serverless']
    },
    {
        title: 'Debugging Queue',
        description: 'Fixing function retry loops in background workers.',
        tags: ['dotnet', 'debugging', 'azure']
    }
];

describe('filterBySearchAndTag', () => {
    it('returns all items when no search term and no filter', () => {
        expect(filterBySearchAndTag({
            items,
            searchQuery: '',
            activeTag: 'All'
        })).toHaveLength(2);
    });

    it('matches on title, description, and tags with case-insensitive search', () => {
        const titleResult = filterBySearchAndTag({
            items,
            searchQuery: 'serverLESs',
            activeTag: 'All'
        });
        const tagResult = filterBySearchAndTag({
            items,
            searchQuery: 'queue',
            activeTag: 'All'
        });
        const descriptionResult = filterBySearchAndTag({
            items,
            searchQuery: 'background',
            activeTag: 'All'
        });

        expect(titleResult).toHaveLength(1);
        expect(titleResult[0].title).toBe('Serverless AI');
        expect(tagResult).toHaveLength(1);
        expect(tagResult[0].title).toBe('Debugging Queue');
        expect(descriptionResult).toHaveLength(1);
        expect(descriptionResult[0].title).toBe('Debugging Queue');
    });

    it('filters by active tag while preserving search', () => {
        const tagged = filterBySearchAndTag({
            items,
            searchQuery: 'a',
            activeTag: 'DotNet'
        });

        expect(tagged).toHaveLength(1);
        expect(tagged[0].title).toBe('Debugging Queue');
    });
});

describe('query helpers', () => {
    it('returns a valid view mode', () => {
        expect(getValidViewMode('grid')).toBe('grid');
        expect(getValidViewMode('invalid')).toBe('list');
    });

    it('normalizes tag queries case-insensitively', () => {
        expect(getTagFromQuery('SERVERLESS', ['All', 'serverless', 'azure'])).toBe('serverless');
        expect(getTagFromQuery('missing', ['All', 'serverless'])).toBe('All');
    });
});
