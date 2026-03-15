import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import App, { AppRoutes } from './App';
import { BLOG_POSTS } from './data/blogPosts';

afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
});

const renderApp = (path: string) => {
    window.history.replaceState({}, '', path);
    return render(<App />);
};

const renderRoute = (path: string) => {
    render(
        <MemoryRouter initialEntries={[path]}>
            <AppRoutes />
        </MemoryRouter>
    );
};

type FetchMockResponse = Response | Error;
const mockFetch = (resolver: (url: string) => FetchMockResponse) => {
    vi.spyOn(window, 'fetch').mockImplementation((input: string | URL | Request) => {
        const requestUrl = typeof input === 'string'
            ? input
            : input instanceof URL
                ? input.href
                : input.url;
        const result = resolver(requestUrl);
        return result instanceof Response ? Promise.resolve(result) : Promise.reject(result);
    });
};

const withNavigatorOnlineState = (isOnline: boolean) => {
    const originalState = window.navigator.onLine;
    Object.defineProperty(window.navigator, 'onLine', {
        configurable: true,
        get: () => isOnline,
    });

    return () => {
        Object.defineProperty(window.navigator, 'onLine', {
            configurable: true,
            get: () => originalState,
        });
    };
};

describe('route rendering', () => {
    it('renders home route', async () => {
        renderRoute('/');
        expect(await screen.findByRole('heading', { name: /Akshay's Portfolio/i })).toBeInTheDocument();
    });

    it('renders projects route', async () => {
        renderRoute('/projects');
        expect(await screen.findByRole('heading', { name: /Shipped Code/i })).toBeInTheDocument();
    });

    it('renders blog route', async () => {
        renderRoute('/blog');
        expect(await screen.findByRole('heading', { name: /commit_log/i })).toBeInTheDocument();
    });

    it('renders about route', async () => {
        renderRoute('/about');
        expect(await screen.findByRole('heading', { name: /System Identity/i })).toBeInTheDocument();
    });

    it('renders article route with mocked markdown', async () => {
        vi.spyOn(window, 'fetch').mockResolvedValue(
            new Response(
                '# Route Article\n\nA markdown body for route testing.',
                { status: 200 }
            )
        );

        renderRoute('/blog/PluckIt-Apple');
        expect(await screen.findByRole('heading', { name: 'Route Article' })).toBeInTheDocument();
    });

    it('shows not found for unknown route', async () => {
        renderRoute('/does-not-exist');
        expect(await screen.findByRole('heading', { name: '404' })).toBeInTheDocument();
    });

    it('guards unknown article slugs and renders not found', async () => {
        renderRoute('/blog/not-a-real-slug');
        expect(await screen.findByRole('heading', { name: '404' })).toBeInTheDocument();
    });
});

describe('runtime surfaces', () => {
    it('navigates via command palette search', async () => {
        const user = userEvent.setup();
        renderApp('/');

        await user.click(screen.getByRole('button', { name: /open command palette/i }));
        await user.type(await screen.findByLabelText('Search pages and posts'), 'status');
        await user.click(await screen.findByRole('option', { name: /go to system status/i }));

        expect(await screen.findByRole('heading', { name: /Deployment & Iteration Ledger/i })).toBeInTheDocument();
        expect(window.location.pathname).toBe('/status');
    });

    it('supports project search and tag filter combinations', async () => {
        renderRoute('/projects?tag=AI&search=PluckIt');
        expect(await screen.findByRole('heading', { name: 'PluckIt' })).toBeInTheDocument();
        expect(screen.getByText('A wardrobe app with an embedded AI feature to help you organize your closet and get style ideas.')).toBeInTheDocument();
    });

    it('shows no projects when search + tag filters are mismatched', async () => {
        renderRoute('/projects?tag=AI&search=Nope');
        expect(await screen.findByText('No projects found matching the filter.')).toBeInTheDocument();
    });

    it('shows fuzzy 404 suggestions from command route map', async () => {
        renderRoute('/statux');
        expect(await screen.findByRole('heading', { name: '404' })).toBeInTheDocument();
        expect(await screen.findByText('Did you mean one of these?')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: '/status' })).toBeInTheDocument();
    });

    it('flags failed status probes when status endpoint is unavailable', async () => {
        const latestPostSlug = BLOG_POSTS[0]?.id ?? 'PluckIt-Apple';
        const probeMarkdownPath = `/content/blog/${latestPostSlug}.md`;
        mockFetch((url) => {
            if (url === '/content/changelog.md') {
                return new Response('# [v1.0.0]\n- Initial release\n', { status: 200 });
            }
            if (url === '/status') {
                return new Response('temporarily unavailable', {
                    status: 503,
                    statusText: 'Service Unavailable',
                });
            }
            if (url === '/') {
                return new Response('ok', { status: 200 });
            }
            if (url === probeMarkdownPath) {
                return new Response('latest post body', { status: 200 });
            }
            return new Response('ok', { status: 200 });
        });

        renderRoute('/status');

        expect(await screen.findByText('3/4 endpoints available')).toBeInTheDocument();
        expect(screen.getByText(/status: 503/i)).toBeInTheDocument();
    });

    it('shows offline messaging for changelog fetches', async () => {
        const restoreNetwork = withNavigatorOnlineState(false);
        const fetchSpy = vi.spyOn(window, 'fetch').mockResolvedValue(new Response('offline should not be called', { status: 200 }));

        try {
            renderRoute('/changelog');
            expect(await screen.findByText('You are currently offline. Connect to the internet and retry.')).toBeInTheDocument();
            expect(screen.getByText('Network appears offline.')).toBeInTheDocument();
            expect(fetchSpy).not.toHaveBeenCalled();
        } finally {
            restoreNetwork();
        }
    });
});
