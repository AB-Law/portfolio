export type BlogPost = {
    id: string;
    title: string;
    date: string;
    description: string;
    tags: string[];
    readTime: string;
    image?: string;
};

export const BLOG_POSTS: BlogPost[] = [
    {
        id: 'PluckIt-Apple',
        title: 'How I Split Local AI Across iPhone, Mac, and Cloud in PluckIt',
        date: '2026-03-15',
        description: 'A practical architecture for shipping local AI where it helps: iOS preprocessing, macOS local try-on, and a shared backend fallback path.',
        tags: ['swift', 'ios', 'macos', 'model-deployment', 'machine-learning', 'architecture', 'azure'],
        readTime: '16m read',
        image: '/images/VTON-Example.png'
    },
    {
        id: 'queue-trigger-encoding-debug',
        title: 'Fixing Azure Storage Queue trigger instant-poisoning in dotnet-isolated Functions',
        date: '2026-02-15',
        description: 'Debugging a really annoying issue with dotnet isolated functions',
        tags: ['azure', 'dotnet', 'debugging', 'azure-functions', 'storage-queue'],
        readTime: '8m read'
    },
    {
        id: 'legacy_migration_graph_engine',
        title: 'Refactoring Legacy code using a dependency graph',
        date: '2026-01-20',
        description: 'How you can look back at work you have done and improve it',
        tags: ['dotnet', 'debugging', 'postgres', 'vb.net'],
        readTime: '12m read'
    },


];
