export type ChangelogRelease = {
    version: string;
    date?: string;
    body: string;
};

const RELEASE_SECTION_HEADER = /^##\s+\[([^\]]+)\]\s*(?:-\s*(.+?))?\s*$/;

export const parseChangelogReleases = (content: string): ChangelogRelease[] => {
    const releases: ChangelogRelease[] = [];
    const lines = content.split('\n');

    let currentVersion: string | null = null;
    let currentDate: string | undefined;
    let currentBody: string[] = [];

    const flushCurrent = () => {
        if (!currentVersion) {
            return;
        }

        releases.push({
            version: currentVersion,
            date: currentDate,
            body: currentBody.join('\n').trim(),
        });

        currentVersion = null;
        currentDate = undefined;
        currentBody = [];
    };

    for (const line of lines) {
        const headerMatch = line.match(RELEASE_SECTION_HEADER);
        if (headerMatch) {
            flushCurrent();
            currentVersion = headerMatch[1]?.trim() || 'release';
            currentDate = headerMatch[2]?.trim() || undefined;
            continue;
        }

        if (currentVersion) {
            currentBody.push(line);
        }
    }

    flushCurrent();

    return releases;
};

export const getLatestChangelogDate = (releases: ChangelogRelease[]): string | undefined => {
    return releases[0]?.date?.trim();
};

export const loadChangelogReleases = async (path = '/content/changelog.md'): Promise<ChangelogRelease[]> => {
    const response = await fetch(path);
    if (!response.ok) {
        throw new Error(`Unable to load changelog feed from ${path}.`);
    }
    const raw = await response.text();
    return parseChangelogReleases(raw);
};

