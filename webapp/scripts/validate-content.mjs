import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(__filename), '..');
const PUBLIC_DIR = path.resolve(PROJECT_ROOT, 'public');
const BLOG_DIR = path.resolve(PUBLIC_DIR, 'content', 'blog');
const CHANGELOG_FILE = path.resolve(PUBLIC_DIR, 'content', 'changelog.md');

const FRONT_MATTER_BLOCK = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/;
const FRONT_MATTER_LINE = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/;
const FRONT_MATTER_LIST_ITEM = /^\s*-\s*(.+)$/;
const MARKDOWN_LINK_PATTERN = /!?\[[^\]]*?\]\(([^)\n]+)\)/g;
const FRONT_MATTER_FIELDS = ['title', 'date', 'description', 'readTime'];
const ROUTES = new Set(['/','/projects','/blog','/status','/changelog','/about','/404']);
const SKIP_SCHEMES = /^(?:[a-z]+:)/i;

const stripYamlQuotes = (value) =>
    value.trim().replace(/^"(.*)"$/g, '$1').replace(/^'(.*)'$/g, '$1');

const parseTagListFromValue = (value) => {
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

const parseFrontmatter = (markdown) => {
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

    const rawFrontmatter = (match[1] ?? '').replace(/\r\n/g, '\n');
    const lines = rawFrontmatter.split('\n');
    const frontmatter = {};

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
            const values = [];
            while (index + 1 < lines.length) {
                const nextLine = lines[index + 1];
                if (!nextLine) {
                    break;
                }

                const itemMatch = nextLine.match(FRONT_MATTER_LIST_ITEM);
                if (!itemMatch) {
                    break;
                }

                const item = stripYamlQuotes(itemMatch[1]);
                if (item) {
                    values.push(item);
                }

                index += 1;
            }

            frontmatter[key] = values;
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
        body: markdown.slice(match[0].length).trimStart(),
    };
};

const isValidString = (value) => typeof value === 'string' && value.trim() !== '';

const validateBlogFrontmatter = (frontmatter, sourceFile, slug) => {
    const errors = [];
    const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags.filter(tag => String(tag).trim()) : [];

    for (const field of FRONT_MATTER_FIELDS) {
        if (!isValidString(frontmatter[field])) {
            errors.push(`missing required ${field}`);
        }
    }

    if (tags.length === 0) {
        errors.push('missing required tags');
    }

    if (typeof frontmatter.date === 'string' && frontmatter.date.trim() !== '') {
        if (Number.isNaN(Date.parse(frontmatter.date))) {
            errors.push(`invalid date format "${frontmatter.date}"`);
        }
    }

    if (errors.length > 0) {
        return [
            `Invalid frontmatter in ${path.relative(PROJECT_ROOT, sourceFile)} (${slug}): ${errors.join(', ')}`,
        ];
    }

    return [];
};

const listBlogFiles = async () => {
    const dir = await readdir(BLOG_DIR, { withFileTypes: true });
    return dir
        .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
        .map(entry => path.resolve(BLOG_DIR, entry.name));
};

const fileExists = async (absolutePath) => {
    try {
        await access(absolutePath);
        return true;
    } catch {
        return false;
    }
};

const isExternalLikeLink = (value) => {
    if (!value) {
        return true;
    }

    if (value.startsWith('#')) {
        return true;
    }

    if (SKIP_SCHEMES.test(value)) {
        return !value.startsWith('/');
    }

    if (value.startsWith('www.')) {
        return true;
    }

    return false;
};

const toCleanPath = (value) => {
    const withoutQuery = value.split('?')[0];
    const withoutHash = withoutQuery.split('#')[0];
    return withoutHash.trim();
};

const validateRelativeLink = async (rawHref, sourcePath) => {
    const sourceDir = path.dirname(sourcePath);
    const targetCandidate = path.resolve(sourceDir, rawHref);
    const publicWithSep = `${PUBLIC_DIR}${path.sep}`;

    if (!targetCandidate.startsWith(publicWithSep) && targetCandidate !== PUBLIC_DIR) {
        return [`Invalid relative link "${rawHref}" in ${sourcePath}: links must stay within /public/.`];
    }

    const exists = await fileExists(targetCandidate);
    if (!exists) {
        return [`Broken internal link "${rawHref}" in ${sourcePath}: no file at ${path.relative(PROJECT_ROOT, targetCandidate)}`];
    }

    return [];
};

const validateRootLink = async (rawHref, sourceFile, blogSlugs) => {
    if (!ROUTES.has(rawHref) && rawHref !== '/') {
        if (rawHref.startsWith('/blog/')) {
            const slug = rawHref.replace(/^\/blog\//, '').replace(/\/+$/, '');
            if (!slug) {
                return [`Invalid blog link "${rawHref}" in ${sourceFile}: missing blog slug.`];
            }

            if (!blogSlugs.has(slug)) {
                return [`Broken blog route in ${sourceFile}: ${rawHref} does not match any known blog slug.`];
            }

            return [];
        }

        const staticCandidate = path.resolve(PUBLIC_DIR, rawHref.replace(/^\//, ''));
        const hasStaticAsset = await fileExists(staticCandidate);
        if (!hasStaticAsset) {
            return [`Broken internal root link "${rawHref}" in ${sourceFile}: no matching static route or asset.`];
        }
    }

    return [];
};

const validateLink = async (href, sourceFile, blogSlugs) => {
    const cleaned = toCleanPath(href);
    if (!cleaned) {
        return [];
    }

    if (isExternalLikeLink(cleaned)) {
        return [];
    }

    if (cleaned.startsWith('/')) {
        return validateRootLink(cleaned, sourceFile, blogSlugs);
    }

    if (cleaned.startsWith('./') || cleaned.startsWith('../') || !cleaned.includes('://')) {
        return validateRelativeLink(cleaned, sourceFile);
    }

    return [];
};

const parseMarkdownLinkTarget = (rawTarget) => {
    const withoutEnclosure = rawTarget.replace(/^<|>$/g, '').trim();
    const match = withoutEnclosure.match(/^(.+?)(?:\s+["'].*["'])?$/);
    if (!match || !match[1]) {
        return null;
    }

    return match[1].trim();
};

const collectMarkdownLinks = (content) => {
    const links = [];
    const withoutCode = content.replace(/```[\s\S]*?```/g, '');
    for (const match of withoutCode.matchAll(MARKDOWN_LINK_PATTERN)) {
        if (typeof match[1] === 'string' && match[1].trim()) {
            const parsedTarget = parseMarkdownLinkTarget(match[1].trim());
            if (parsedTarget) {
                links.push(parsedTarget);
            }
        }
    }

    return links;
};

const collectMarkdownFileErrors = async (markdownFiles, blogSlugs) => {
    const errors = [];

    for (const file of markdownFiles) {
        const source = await readFile(file, 'utf8');
        const slug = path.basename(file).replace(/\.md$/i, '');
        const { frontmatter, body } = parseFrontmatter(source);

        const frontmatterErrors = validateBlogFrontmatter(frontmatter, file, slug);
        errors.push(...frontmatterErrors);

        const links = collectMarkdownLinks(body);
        for (const href of links) {
            const linkErrors = await validateLink(href, file, blogSlugs);
            errors.push(...linkErrors);
        }
    }

    return errors;
};

const collectChangelogErrors = async (blogSlugs) => {
    const source = await readFile(CHANGELOG_FILE, 'utf8');
    const { body } = parseFrontmatter(source);
    const errors = [];

    const links = collectMarkdownLinks(body);

    for (const href of links) {
        const linkErrors = await validateLink(href, CHANGELOG_FILE, blogSlugs);
        errors.push(...linkErrors);
    }

    return errors;
};

const collectBlogSlugs = (markdownFiles) => {
    return markdownFiles.map(file => path.basename(file).replace(/\.md$/i, ''));
};

const detectDuplicateSlugs = (slugs) => {
    const seen = new Set();
    const flagged = new Set();
    const duplicates = [];

    for (const slug of slugs) {
        if (seen.has(slug)) {
            if (flagged.has(slug)) {
                continue;
            }

            flagged.add(slug);
            duplicates.push(slug);
            continue;
        }

        seen.add(slug);
    }

    return duplicates;
};

const validateContent = async () => {
    const blogFiles = await listBlogFiles();
    const slugList = collectBlogSlugs(blogFiles);
    const blogSlugs = new Set(slugList);
    const allErrors = [];

    const duplicates = detectDuplicateSlugs(slugList);
    duplicates.forEach((slug) => {
        allErrors.push(`Duplicate blog slug detected in content/blog: "${slug}"`);
    });

    const blogErrors = await collectMarkdownFileErrors(blogFiles, blogSlugs);
    blogErrors.forEach((message) => allErrors.push(message));

    const changelogErrors = await collectChangelogErrors(blogSlugs);
    changelogErrors.forEach((message) => allErrors.push(message));

    if (allErrors.length > 0) {
        console.error('[content validation] Errors found:');
        allErrors.forEach((entry) => {
            console.error(entry);
        });
        process.exit(1);
    }

    console.warn(`[content validation] OK: ${blogFiles.length} blog posts and 1 changelog file validated.`);
};

validateContent().catch((error) => {
    console.error('[content validation] Unexpected failure:', error);
    process.exit(1);
});
