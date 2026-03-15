import VTON_EXAMPLE_IMAGE from '@/assets/images/VTON-Example.png';

export interface MarkdownImageAsset {
    src: string;
    width: number;
    height: number;
    alt: string;
}

export const MARKDOWN_IMAGE_ASSETS: Record<string, MarkdownImageAsset> = {
    '/images/VTON-Example.png': {
        src: VTON_EXAMPLE_IMAGE,
        width: 3450,
        height: 1738,
        alt: 'Local VTON sample output',
    },
};

export const getMarkdownImageAsset = (rawSource: string | null | undefined): MarkdownImageAsset | null => {
    if (!rawSource) {
        return null;
    }

    const trimmedSource = rawSource.trim();
    if (!trimmedSource) {
        return null;
    }

    const normalizedSource = `/${trimmedSource.replace(/^\.\//, '').replace(/\/+/g, '/').replace(/^\/+/, '')}`;

    return MARKDOWN_IMAGE_ASSETS[normalizedSource] ?? null;
};

