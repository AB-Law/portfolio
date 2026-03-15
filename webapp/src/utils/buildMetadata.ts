type DependencyMap = Record<string, string>;

type PackageManifest = {
    name?: string;
    version?: string;
    dependencies?: DependencyMap;
    devDependencies?: DependencyMap;
};

const PACKAGE_MANIFEST_RAW = import.meta.glob('/package.json', { query: '?raw', import: 'default', eager: true })['/package.json'];

const getEnvValue = (keys: readonly string[]): string | undefined => {
    for (const key of keys) {
        const value = (import.meta.env as Record<string, string | undefined>)[key];
        if (typeof value === 'string' && value.trim() !== '') {
            return value.trim();
        }
    }

    return undefined;
};

const parsePackageManifest = (raw?: string): PackageManifest | null => {
    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw) as PackageManifest;
    } catch {
        return null;
    }
};

const packageManifest = parsePackageManifest(typeof PACKAGE_MANIFEST_RAW === 'string' ? PACKAGE_MANIFEST_RAW : undefined);

export const packageName = packageManifest?.name ?? 'portfolio-webapp';
export const packageVersion = packageManifest?.version ?? '0.0.0';
export const dependencies = packageManifest?.dependencies ?? {};
export const devDependencies = packageManifest?.devDependencies ?? {};

export const deployedBranch =
    getEnvValue(['VITE_DEPLOY_BRANCH', 'VITE_BRANCH']) ?? 'local';
export const deployedCommit =
    getEnvValue(['VITE_DEPLOY_COMMIT', 'VITE_COMMIT_HASH']) ?? 'local';
export const deployedCommitDate = getEnvValue(['VITE_DEPLOY_COMMIT_DATE']);
export const buildTime = getEnvValue(['VITE_BUILD_TIME']) ?? 'N/A';
export const deployedVersion =
    getEnvValue(['VITE_DEPLOY_VERSION', 'VITE_RELEASE_VERSION', 'VITE_VERSION']) ?? packageVersion;

export const getShortCommit = (commit: string, length = 7): string =>
    commit === 'local' ? 'local' : `${commit.slice(0, length)}${commit.length > length ? '...' : ''}`;
