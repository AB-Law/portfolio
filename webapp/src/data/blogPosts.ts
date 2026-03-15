import { MARKDOWN_IMAGE_ASSETS } from './markdownImageAssets';

export type BlogPost = {
    id: string;
    title: string;
    date: string;
    description: string;
    tags: string[];
    readTime: string;
    image?: string | {
        src: string;
        width?: number;
        height?: number;
        alt?: string;
    };
};

type RawFrontmatter = Record<string, string | string[]>;
type BlogPostContentEntry = BlogPost & {
    content: string;
};

const BLOG_POST_MARKDOWN = import.meta.glob('/src/content/blog/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const FRONT_MATTER_BLOCK = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/;
const FRONT_MATTER_LINE = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/;
const FRONT_MATTER_LIST_ITEM = /^\s*-\s*(.+)$/;

const stripYamlQuotes = (value: string): string =>
    value.trim().replace(/^"(.*)"$/g, '$1').replace(/^'(.*)'$/g, '$1');

const parseTagListFromValue = (value: string): string[] => {
    const normalized = value.trim();
    const compact = normalized.startsWith('[') && normalized.endsWith(']')
        ? normalized.slice(1, -1)
        : normalized;

    if (!compact.trim()) {
        return [];
    }

    return compact
        .split(',')
        .map(tag => stripYamlQuotes(tag))
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
};

type BlogFrontmatterErrorContext = {
    postId: string;
    path: string;
};

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';

const parseFrontmatterBlock = (markdown: string): { frontmatter: RawFrontmatter; body: string } => {
    if (!markdown.startsWith('---')) {
        return {
            frontmatter: {},
            body: markdown,
        };
    }

    const match = markdown.match(FRONT_MATTER_BLOCK);
    if (!match || match.index !== 0) {
        return {
            frontmatter: {},
            body: markdown,
        };
    }

    const [fullMatch, rawFrontmatter = ''] = match;
    const frontmatter: RawFrontmatter = {};
    const lines = rawFrontmatter.replace(/\r\n/g, '\n').split('\n');

    for (let index = 0; index < lines.length; index += 1) {
        const rawLine = lines[index];
        const trimmedLine = rawLine.trim();
        if (!trimmedLine || trimmedLine.startsWith('#')) {
            continue;
        }

        const assignmentMatch = trimmedLine.match(FRONT_MATTER_LINE);
        if (!assignmentMatch || !assignmentMatch[1]) {
            continue;
        }

        const key = assignmentMatch[1];
        const value = assignmentMatch[2]?.trim() ?? '';

        if (!value) {
            const listValues: string[] = [];
            while (index + 1 < lines.length) {
                const nextLine = lines[index + 1];
                if (nextLine === undefined) {
                    break;
                }

                const itemMatch = nextLine.match(FRONT_MATTER_LIST_ITEM);
                if (!itemMatch) {
                    break;
                }

                const item = stripYamlQuotes(itemMatch[1]);
                if (item) {
                    listValues.push(item);
                }

                index += 1;
            }

            frontmatter[key] = listValues;
            continue;
        }

        if (key === 'tags') {
            frontmatter[key] = parseTagListFromValue(value);
        } else {
            frontmatter[key] = stripYamlQuotes(value);
        }
    }

    return {
        frontmatter,
        body: markdown.slice(fullMatch.length).trimStart(),
    };
};

const parseDateForSorting = (value: string): number => {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
};

const validateFrontmatter = (
    frontmatter: RawFrontmatter,
    { path, postId }: BlogFrontmatterErrorContext,
): {
    title: string;
    date: string;
    description: string;
    readTime: string;
    tags: string[];
} => {
    const errors: string[] = [];
    const title = typeof frontmatter.title === 'string' ? stripYamlQuotes(frontmatter.title.trim()) : '';
    const date = typeof frontmatter.date === 'string' ? stripYamlQuotes(frontmatter.date.trim()) : '';
    const description = typeof frontmatter.description === 'string'
        ? stripYamlQuotes(frontmatter.description.trim())
        : '';
    const readTime = typeof frontmatter.readTime === 'string'
        ? stripYamlQuotes(frontmatter.readTime.trim())
        : '';
    const tags = Array.isArray(frontmatter.tags)
        ? frontmatter.tags
            .map(tag => String(tag).trim())
            .filter(tag => tag.length > 0)
        : [];

    if (!isNonEmptyString(title)) {
        errors.push('title');
    }

    if (!isNonEmptyString(date)) {
        errors.push('date');
    } else if (Number.isNaN(Date.parse(date))) {
        errors.push('date (invalid format)');
    }

    if (!isNonEmptyString(description)) {
        errors.push('description');
    }

    if (!isNonEmptyString(readTime)) {
        errors.push('readTime');
    }

    if (tags.length === 0) {
        errors.push('tags');
    }

    if (errors.length > 0) {
        throw new Error(
            `Invalid frontmatter in "${path}" (slug: "${postId}"). Missing or invalid required fields: ${errors.join(', ')}.`
        );
    }

    return { title, date, description, readTime, tags };
};

const parseBlogPosts = (): BlogPostContentEntry[] => {
    const entries: BlogPostContentEntry[] = [];
    const markdownEntries = Object.entries(BLOG_POST_MARKDOWN);
    const slugSet = new Set<string>();

    for (const [path, markdown] of markdownEntries) {
        const postFileName = path.replace(/^.*\//, '');
        const postId = postFileName.replace(/\.md$/i, '');
        if (slugSet.has(postId)) {
            throw new Error(`Duplicate blog slug "${postId}" found for ${path}. Slugs must be unique across content/blog markdown files.`);
        }

        slugSet.add(postId);
        try {
            const { frontmatter, body } = parseFrontmatterBlock(markdown);
            const { title, date, description, readTime, tags } = validateFrontmatter(frontmatter, { postId, path });
            const rawImage = typeof frontmatter.image === 'string' ? frontmatter.image.trim() : '';
            const image = rawImage
                ? MARKDOWN_IMAGE_ASSETS[rawImage] || MARKDOWN_IMAGE_ASSETS[`./${rawImage.replace(/^\/+/, '')}`] || rawImage
                : undefined;

            entries.push({
                id: postId,
                title,
                date,
                description,
                tags,
                readTime,
                image,
                content: body,
            });
        } catch (error) {
            if (import.meta.env.DEV) {
                console.warn(`Skipping blog post "${postId}" from ${path} due to invalid frontmatter:`, error);
            }
        }
    }

    return entries.sort((left, right) => parseDateForSorting(right.date) - parseDateForSorting(left.date) || left.id.localeCompare(right.id));
};

export const BLOG_POST_DOCUMENTS: BlogPostContentEntry[] = parseBlogPosts();
export const BLOG_POSTS: BlogPost[] = BLOG_POST_DOCUMENTS;
