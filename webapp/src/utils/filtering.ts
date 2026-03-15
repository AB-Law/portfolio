type SearchableItem = {
    title: string;
    description: string;
    tags: string[];
};

export type BlogViewMode = 'grid' | 'list';

export const getValidViewMode = (value: string | null): BlogViewMode => {
    if (value === 'grid' || value === 'list') {
        return value;
    }

    return 'list';
};

export const getTagFromQuery = (value: string | null, availableTags: string[]): string => {
    if (!value) return 'All';
    return availableTags.find(tag => tag.toLowerCase() === value.toLowerCase()) ?? 'All';
};

type FilterArgs<T extends SearchableItem> = {
    items: T[];
    searchQuery: string;
    activeTag: string;
};

export const filterBySearchAndTag = <T extends SearchableItem>({
    items,
    searchQuery,
    activeTag
}: FilterArgs<T>): T[] => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const normalizedTag = activeTag.toLowerCase();

    return items.filter(item => {
        const hasMatchingTag = normalizedTag === 'all' || item.tags.some(tag => tag.toLowerCase() === normalizedTag);
        if (!hasMatchingTag) return false;

        if (!normalizedQuery) return true;

        const normalizedTitle = item.title.toLowerCase();
        const normalizedDescription = item.description.toLowerCase();

        if (normalizedTitle.includes(normalizedQuery) || normalizedDescription.includes(normalizedQuery)) {
            return true;
        }

        return item.tags.some(tag => tag.toLowerCase().includes(normalizedQuery));
    });
};
