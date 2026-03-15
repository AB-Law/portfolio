import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const BUILD_DIR = path.resolve(process.cwd(), 'build');
const MANIFEST_PATH = path.join(BUILD_DIR, '.vite', 'manifest.json');
const BUDGETS_PATH = path.resolve(process.cwd(), 'perf-budgets.json');

const BUDGETS = (() => {
    if (!existsSync(BUDGETS_PATH)) {
        return {
            entryJsBytes: 220 * 1024,
            asyncChunkBytes: 300 * 1024,
            totalJsCssBytes: 950 * 1024,
        };
    }

    return JSON.parse(readFileSync(BUDGETS_PATH, 'utf8'));
})();

const kb = (bytes) => Math.round((bytes / 1024) * 100) / 100;
const readManifest = () => {
    if (!existsSync(MANIFEST_PATH)) {
        throw new Error('Missing Vite manifest.json. Run vite build with manifest enabled.');
    }
    return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
};

const getFiles = (manifest) =>
    Object.entries(manifest).map(([source, chunk]) => {
        if (!chunk.file || !existsSync(path.join(BUILD_DIR, chunk.file))) {
            return null;
        }

        return {
            source,
            ...chunk,
            size: statSync(path.join(BUILD_DIR, chunk.file)).size,
            ext: chunk.file?.split('.').pop(),
        };
    }).filter(Boolean);

const run = () => {
    const manifest = readManifest();
    const files = getFiles(manifest);
    const jsFiles = files.filter((file) => file.ext === 'js');
    const cssFiles = files.filter((file) => file.ext === 'css');

    const entryChunk = files.find((entry) => entry.source === 'index.html' || entry.isEntry);
    const asyncChunks = jsFiles.filter((entry) => entry.isDynamicEntry);

    const totalBundleBytes = jsFiles.reduce((sum, entry) => sum + entry.size, 0) + cssFiles.reduce((sum, entry) => sum + entry.size, 0);
    const largestAsyncChunk = asyncChunks.reduce((max, entry) => (entry.size > max.size ? entry : max), { size: 0, file: '' });

    const failures = [];
    if (!entryChunk) {
        failures.push('Could not resolve initial entry chunk from manifest.');
    } else {
        if (entryChunk.size > BUDGETS.entryJsBytes) {
            failures.push(`Initial JS chunk is ${kb(entryChunk.size)}KB (budget ${kb(BUDGETS.entryJsBytes)}KB).`);
        }
    }

    if (largestAsyncChunk.size > BUDGETS.asyncChunkBytes) {
        failures.push(`Largest async chunk is ${kb(largestAsyncChunk.size)}KB (budget ${kb(BUDGETS.asyncChunkBytes)}KB).`);
    }

    if (totalBundleBytes > BUDGETS.totalJsCssBytes) {
        failures.push(`Total JS+CSS output is ${kb(totalBundleBytes)}KB (budget ${kb(BUDGETS.totalJsCssBytes)}KB).`);
    }

    console.warn('Bundle size report');
    console.warn(`- total JS+CSS: ${kb(totalBundleBytes)}KB`);
    if (entryChunk) {
        console.warn(`- initial JS: ${kb(entryChunk.size)}KB (${entryChunk.file})`);
    }
    if (largestAsyncChunk.file) {
        console.warn(`- largest async chunk: ${kb(largestAsyncChunk.size)}KB (${largestAsyncChunk.file})`);
    }
    cssFiles.forEach((entry) => {
        console.warn(`- css: ${entry.file} ${kb(entry.size)}KB`);
    });

    if (failures.length > 0) {
        console.error('\nBundle budget check failed:');
        failures.forEach((item) => console.error(`- ${item}`));
        process.exit(1);
    }

    console.warn('\nBundle size checks passed.');
};

run();
