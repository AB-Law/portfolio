import { BLOG_POST_DOCUMENTS, type BlogPost } from './blogPosts';
import {
    buildSearchPreview,
    buildSearchText,
    extractMarkdownHeadings,
    markdownToSearchText,
    type SearchIndexItem,
} from '../utils/contentSearch';

export type BlogSearchIndexItem = BlogPost & SearchIndexItem;

const buildSearchIndex = (): BlogSearchIndexItem[] => {
    const loadedPosts = BLOG_POST_DOCUMENTS.map((post) => {
        const { content, ...metadata } = post;

        const headings = extractMarkdownHeadings(content);
        const headingsText = headings.join(' ');
        const bodyText = markdownToSearchText(content);
        const tagsText = metadata.tags.map(tag => tag.trim().toLowerCase()).join(' ');
        const searchText = buildSearchText({
            title: metadata.title,
            description: metadata.description,
            tagsText,
            headingsText,
            bodyText,
        });
        const defaultPreview = buildSearchPreview(bodyText, '', {
            headings,
            fallback: metadata.description,
            maxLength: 220,
        });

        return {
            ...metadata,
            tagsText,
            headings,
            headingsText,
            bodyText,
            searchText,
            defaultPreview,
        };
    });

    return loadedPosts;
};

export const BLOG_SEARCH_INDEX = buildSearchIndex();

