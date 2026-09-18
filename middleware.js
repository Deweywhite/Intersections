// Vercel Edge Middleware — runs before static file serving.
//
// This is the ONLY thing keeping the word lists private. A vercel.json
// rewrite cannot do it: Vercel serves a matching static file before
// rewrites are consulted, so /_private/scheduled_pairs.json would be
// handed out as-is. Middleware runs first.
//
// api/pair.js and api/validate.js still read these files from disk inside
// the serverless function — that path never goes through HTTP.

export const config = {
    runtime: 'nodejs',   // Vercel deprecated the default 'edge' runtime for middleware
    matcher: ['/_private/:path*', '/Private/:path*', '/supabase/:path*']
};

export default function middleware() {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: {
            'content-type': 'application/json',
            'x-robots-tag': 'noindex'
        }
    });
}
