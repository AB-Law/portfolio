import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import * as ts from 'typescript';

const PROJECT_ROOT = process.cwd();
const PUBLIC_DIR = path.resolve(PROJECT_ROOT, 'public');
const CONTENT_DIR = path.resolve(PUBLIC_DIR, 'content');
const SEO_ASSETS_PATH = path.resolve(PUBLIC_DIR, 'seo-assets.json');
const RSS_PATH = path.resolve(PUBLIC_DIR, 'rss.xml');
const SITEMAP_PATH = path.resolve(PUBLIC_DIR, 'sitemap.xml');
const ROBOTS_PATH = path.resolve(PUBLIC_DIR, 'robots.txt');
const SOCIAL_IMAGES_DIR = path.resolve(PUBLIC_DIR, 'social', 'articles');

const DEFAULT_SITE_URL = 'https://localhost';
const FEED_TITLE = 'Akshay // Portfolio';
const FEED_DESCRIPTION = 'Production-minded engineering notes, architecture updates, and operations snapshots.';
const DEFAULT_POST_DESCRIPTION = 'Read the post on Akshay\'s portfolio.';
const SITE_NAME = 'Akshay // Portfolio';
const SOCIAL_IMAGE_WIDTH = 1200;
const SOCIAL_IMAGE_HEIGHT = 630;
const SOCIAL_IMAGE_MAX_TITLE_LINES = 3;
const SOCIAL_IMAGE_MAX_DESCRIPTION_LINES = 4;
const SOCIAL_IMAGE_MAX_CHARACTERS_PER_LINE = 52;
const SOCIAL_IMAGE_TITLE = `${SITE_NAME} article`;

/**
 * @typedef {{ id: string; title: string; date: string; description: string }} BlogPostMetadata
 */

/**
 * @typedef {{ version: string; date?: string }} ChangelogRelease
 */

/**
 * @typedef {{ path: string; lastMod?: string; changeFrequency?: string; priority: string }} SitemapItem
 */

const STATIC_ROUTES = [
  { path: '/', changeFrequency: 'daily', priority: '1.0' },
  { path: '/projects', changeFrequency: 'weekly', priority: '0.7' },
  { path: '/blog', changeFrequency: 'daily', priority: '0.8' },
  { path: '/status', changeFrequency: 'weekly', priority: '0.4' },
  { path: '/changelog', changeFrequency: 'weekly', priority: '0.6' },
  { path: '/about', changeFrequency: 'monthly', priority: '0.5' },
];

const readText = (filePath) => readFile(filePath, 'utf8');

const stripTrailingSlash = (value) => value.replace(/\/+$/, '');

const escapeXml = (value = '') => {
  const text = String(value);
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
};

const escapeCdata = (value = '') => {
  return String(value).replace(/\]\]>/g, ']]]]><![CDATA[>');
};

const toRssDate = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toUTCString();
  }
  return parsed.toUTCString();
};

const toIsoDate = (value) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().split('T')[0];
};

const parseLiteralString = (node) => {
  if (ts.isStringLiteral(node)) {
    return node.text;
  }

  if (ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }

  return undefined;
};

const getLiteralProp = (objectLiteral, key) => {
  for (const property of objectLiteral.properties) {
    if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name) || property.name.text !== key) {
      continue;
    }

    const value = parseLiteralString(property.initializer);
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
};

const parseBlogPosts = (source) => {
  const sourceFile = ts.createSourceFile('blogPosts.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }

    for (const declaration of statement.declarationList.declarations) {
      if (!declaration.name || !ts.isIdentifier(declaration.name) || declaration.name.text !== 'BLOG_POSTS') {
        continue;
      }

      if (!declaration.initializer || !ts.isArrayLiteralExpression(declaration.initializer)) {
        continue;
      }

      const posts = [];
      for (const element of declaration.initializer.elements) {
        if (!ts.isObjectLiteralExpression(element)) {
          continue;
        }

        const id = getLiteralProp(element, 'id');
        const title = getLiteralProp(element, 'title');
        const date = getLiteralProp(element, 'date');
        const description = getLiteralProp(element, 'description');

        if (id && title && date && description) {
          posts.push({
            id,
            title,
            date,
            description,
          });
        }
      }

      return posts;
    }
  }

  return [];
};

const parseChangelogReleases = (content) => {
  const lines = content.split('\n');
  const RELEASE_SECTION_HEADER = /^##\s+\[([^\]]+)\]\s*(?:-\s*(.+?))?\s*$/;
  const releases = [];

  let currentVersion = null;
  let currentDate;
  for (const line of lines) {
    const headerMatch = line.match(RELEASE_SECTION_HEADER);
    if (headerMatch) {
      if (currentVersion) {
        releases.push({ version: currentVersion, date: currentDate });
      }

      currentVersion = headerMatch[1]?.trim() || null;
      currentDate = headerMatch[2]?.trim() || undefined;
      continue;
    }
  }

  if (currentVersion) {
    releases.push({ version: currentVersion, date: currentDate });
  }

  return releases;
};

const normalizeSiteUrl = () => {
  const configuredUrl = (
    process.env.SITE_URL
    || process.env.VITE_SITE_URL
    || process.env.PUBLIC_SITE_URL
    || process.env.URL
    || DEFAULT_SITE_URL
  ).trim();

  if (!configuredUrl) {
    return DEFAULT_SITE_URL;
  }

  if (/^https?:\/\//i.test(configuredUrl)) {
    return stripTrailingSlash(configuredUrl);
  }

  if (configuredUrl.startsWith('//')) {
    return `https:${stripTrailingSlash(configuredUrl)}`;
  }

  if (configuredUrl.startsWith('/')) {
    return `${DEFAULT_SITE_URL}${configuredUrl}`;
  }

  return `https://${stripTrailingSlash(configuredUrl)}`;
};

const buildSitemap = (items, siteUrl) => {
  const body = items
    .map((entry) => {
      const absoluteUrl = `${siteUrl}${entry.path}`;
      const lastModValue = toIsoDate(entry.lastMod) || undefined;

      return [
        '  <url>',
        `    <loc>${escapeXml(absoluteUrl)}</loc>`,
        lastModValue ? `    <lastmod>${lastModValue}</lastmod>` : undefined,
        entry.changeFrequency ? `    <changefreq>${entry.changeFrequency}</changefreq>` : undefined,
        `    <priority>${entry.priority}</priority>`,
        '  </url>',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    body,
    '</urlset>',
  ].join('\n');
};

const buildRss = (items, siteUrl, buildTime) => {
  const channelItems = items
    .map((post) => {
      const postUrl = `${siteUrl}/blog/${post.id}`;
      const description = escapeCdata(post.description || DEFAULT_POST_DESCRIPTION);
      return [
        '    <item>',
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${postUrl}</link>`,
        `      <guid isPermaLink="true">${postUrl}</guid>`,
        `      <pubDate>${toRssDate(post.date)}</pubDate>`,
        `      <description><![CDATA[${description}]]></description>`,
        '    </item>',
      ].join('\n');
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(FEED_TITLE)}</title>`,
    `    <description>${escapeXml(FEED_DESCRIPTION)}</description>`,
    `    <link>${siteUrl}</link>`,
    `    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />`,
    `    <lastBuildDate>${toRssDate(buildTime)}</lastBuildDate>`,
    channelItems,
    '  </channel>',
    '</rss>',
  ].join('\n');
};

const buildRobots = (siteUrl) => [
  'User-agent: *',
  'Allow: /',
  'Disallow: /404',
  '',
  `Sitemap: ${siteUrl}/sitemap.xml`,
  '',
].join('\n');

const buildSeoPayload = ({ generatedAt, siteUrl, posts, changelogReleases }) => {
  const changelogCount = changelogReleases.length;

  return {
    generatedAt,
    siteUrl,
    posts: {
      totalCount: posts.length,
      slugs: posts.map((post) => post.id),
    },
    changelog: {
      releaseCount: changelogCount,
      latestRelease: changelogReleases[0]?.version || null,
    },
    assets: {
      sitemap: '/sitemap.xml',
      rss: '/rss.xml',
      robots: '/robots.txt',
      socialImages: '/social/articles',
    },
  };
};

const normalizeLine = (text) => {
  return text
    .replace(/\s+/g, ' ')
    .replace(/`/g, '’')
    .trim();
};

const buildWrappedLines = (input, maxChars, maxLines) => {
  const normalized = normalizeLine(input);
  if (!normalized) {
    return [];
  }

  const words = normalized.split(' ');
  const lines = [];
  let current = '';

  words.forEach((word) => {
    if (!word) {
      return;
    }

    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
      return;
    }

    current = candidate;
  });

  if (current) {
    lines.push(current);
  }

  if (lines.length <= maxLines) {
    return lines;
  }

  const truncated = lines.slice(0, maxLines).map((line, index) => {
    if (index < maxLines - 1) {
      return line;
    }

    if (line.length <= maxChars) {
      return line;
    }

    return `${line.slice(0, Math.max(0, maxChars - 1))}…`;
  });

  return truncated;
};

const buildSocialImageSvg = (post) => {
  const titleLines = buildWrappedLines(post.title, SOCIAL_IMAGE_MAX_CHARACTERS_PER_LINE, SOCIAL_IMAGE_MAX_TITLE_LINES);
  const descriptionLines = buildWrappedLines(
    post.description || DEFAULT_POST_DESCRIPTION,
    SOCIAL_IMAGE_MAX_CHARACTERS_PER_LINE,
    SOCIAL_IMAGE_MAX_DESCRIPTION_LINES
  );

  const titleTspans = titleLines
    .map((line, index) => `<tspan x="72" y="${260 + (index * 68)}">${escapeXml(line)}</tspan>`)
    .join('\n');
  const descriptionTspans = descriptionLines
    .map((line, index) => `<tspan x="72" y="${410 + (index * 42)}">${escapeXml(line)}</tspan>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${SOCIAL_IMAGE_WIDTH}" height="${SOCIAL_IMAGE_HEIGHT}" viewBox="0 0 ${SOCIAL_IMAGE_WIDTH} ${SOCIAL_IMAGE_HEIGHT}" role="img" aria-labelledby="title desc">\n  <title id="title">${escapeXml(SITE_NAME)} article social image</title>\n  <desc id="desc">Share card for ${escapeXml(post.title)}</desc>\n  <defs>\n    <linearGradient id="pageGradient" x1="0%" y1="0%" x2="100%" y2="100%">\n      <stop offset="0%" stop-color="#040c16" />\n      <stop offset="100%" stop-color="#101a2b" />\n    </linearGradient>\n    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">\n      <stop offset="0%" stop-color="#6ee7f7" />\n      <stop offset="100%" stop-color="#d946ef" />\n    </linearGradient>\n  </defs>\n  <rect width="${SOCIAL_IMAGE_WIDTH}" height="${SOCIAL_IMAGE_HEIGHT}" fill="url(#pageGradient)" />\n  <rect x="30" y="30" width="${SOCIAL_IMAGE_WIDTH - 60}" height="${SOCIAL_IMAGE_HEIGHT - 60}" fill="#0b1425" fill-opacity="0.75" stroke="url(#lineGradient)" stroke-width="2" rx="20" />\n  <text x="72" y="110" fill="#8be9ff" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="700">${escapeXml(SITE_NAME)}</text>\n  <text x="72" y="162" fill="#f472b6" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="600">${escapeXml(SOCIAL_IMAGE_TITLE)}</text>\n  ${titleLines.length > 0 ? `<text fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="700" line-height="1.2">${titleTspans}</text>` : ''}\n  ${descriptionLines.length > 0 ? `<text fill="#b6c7dc" font-family="Arial, Helvetica, sans-serif" font-size="24" line-height="1.35">${descriptionTspans}</text>` : ''}\n  <text x="72" y="592" fill="#94a3b8" font-family="Arial, Helvetica, sans-serif" font-size="20">#${post.id}</text>\n</svg>\n`;
};

const writeSocialImage = async (post) => {
  const filePath = path.resolve(SOCIAL_IMAGES_DIR, `${post.id}.svg`);
  const svg = buildSocialImageSvg(post);
  await writeFile(filePath, `${svg}\n`, 'utf8');
};

const generateSeoAssets = async () => {
  const generatedAt = new Date().toISOString();
  const siteUrl = normalizeSiteUrl();
  await Promise.all([
    mkdir(PUBLIC_DIR, { recursive: true }),
    mkdir(SOCIAL_IMAGES_DIR, { recursive: true }),
  ]);

  const [blogPostSource, changelogSource] = await Promise.all([
    readText(path.resolve(PROJECT_ROOT, 'src/data/blogPosts.ts')),
    readText(path.resolve(CONTENT_DIR, 'changelog.md')),
  ]);

  const blogPosts = parseBlogPosts(blogPostSource)
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());

  const changelogReleases = parseChangelogReleases(changelogSource);

  const changelogLatest = changelogReleases[0]?.date;
  const sitemapItems = [
    ...STATIC_ROUTES.map(route => ({ ...route, lastMod: route.path === '/' ? generatedAt : route.path === '/changelog' ? changelogLatest : undefined })),
    ...blogPosts.map((post) => ({
      path: `/blog/${post.id}`,
      lastMod: post.date,
      changeFrequency: 'monthly',
      priority: '0.8',
    })),
  ];

  const payload = buildSeoPayload({
    generatedAt,
    siteUrl,
    posts: blogPosts,
    changelogReleases,
  });

  const rss = buildRss(blogPosts, siteUrl, generatedAt);
  const sitemap = buildSitemap(sitemapItems, siteUrl);
  const robots = buildRobots(siteUrl);
  const payloadJson = `${JSON.stringify(payload, null, 2)}\n`;
  const socialImageWrites = blogPosts.map((post) => writeSocialImage(post));

  await Promise.all([
    writeFile(SEO_ASSETS_PATH, payloadJson, 'utf8'),
    writeFile(RSS_PATH, `${rss}\n`, 'utf8'),
    writeFile(SITEMAP_PATH, `${sitemap}\n`, 'utf8'),
    writeFile(ROBOTS_PATH, robots, 'utf8'),
    ...socialImageWrites,
  ]);

  console.warn(`[seo] generated assets for ${blogPosts.length} ${blogPosts.length === 1 ? 'post' : 'posts'} at ${siteUrl}`);
  console.warn(`[seo] paths:`, {
    rss: path.relative(PROJECT_ROOT, RSS_PATH),
    sitemap: path.relative(PROJECT_ROOT, SITEMAP_PATH),
    robots: path.relative(PROJECT_ROOT, ROBOTS_PATH),
  });
};

generateSeoAssets().catch((error) => {
  console.error('[seo] Failed to generate SEO assets:', error);
    process.exit(1);
});
