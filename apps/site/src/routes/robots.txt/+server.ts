import { PUBLIC_BASE_URL } from '$env/static/public';

export const prerender = true;

const body = `User-agent: *
Allow: /

# Private or per-user pages: nothing to rank, and a crawl budget wasted.
Disallow: /api/
Disallow: /auth/
Disallow: /login
Disallow: /profile/
Disallow: /settings
Disallow: /signup

# Search result pages duplicate the listings they filter.
Disallow: /*?q=

Sitemap: ${new URL('/sitemap.xml', PUBLIC_BASE_URL).href}
`;

export function GET() {
	return new Response(body, {
		headers: { 'content-type': 'text/plain; charset=utf-8' }
	});
}
