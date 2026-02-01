import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    const url = request.nextUrl;
    let hostname = request.headers.get('host') || '';

    // Remove port if present (localhost:3000 case)
    hostname = hostname.replace(/:\d+$/, '');

    // Define main domains (Production & Localhost)
    const isLocalhost = hostname === 'localhost';
    const isMainDomain = hostname === 'hauze.tr' || hostname === 'www.hauze.tr';

    // 1. Root Domain (Admin/Pro/Main Separation) or Localhost specific logic
    if (isMainDomain || isLocalhost) {
        return NextResponse.next();
    }

    // 2. Subdomains
    const searchParams = request.nextUrl.searchParams.toString();
    const path = `${url.pathname}${searchParams.length > 0 ? `?${searchParams}` : ''}`;

    // Extract subdomain: 'tenant1.localhost' -> 'tenant1'
    const subdomain = hostname.split('.')[0];

    // 3. Routing Logic

    // pro.hauze.tr / pro.localhost
    if (subdomain === 'pro') {
        if (url.pathname.startsWith('/auth')) return NextResponse.next();
        return NextResponse.rewrite(new URL(`/pro${path}`, request.url));
    }

    // terminal.hauze.tr / terminal.localhost
    if (subdomain === 'terminal') {
        if (url.pathname.startsWith('/auth')) return NextResponse.next();
        return NextResponse.rewrite(new URL(`/admin${path}`, request.url));
    }

    // 4. Tenant Logic (All other subdomains)
    // tenant1.localhost -> /tenant/tenant1

    // Prevent infinite loops if we are already rewritten
    if (url.pathname.startsWith('/tenant') || url.pathname.startsWith('/404')) {
        return NextResponse.next();
    }

    // API Validation (Edge Compatible Fetch)
    // Note: optimized for "Blank" structure. In production, use KV/Edge Config.
    const API_URL = process.env.API_URL || 'http://localhost:3001';

    try {
        const res = await fetch(`${API_URL}/tenant/profile`, {
            headers: {
                'x-tenant-slug': subdomain,
            },
            next: { revalidate: 60 } // Cache for 60 seconds
        });

        const data = await res.json();

        if (res.status === 404) {
            return NextResponse.rewrite(new URL(`/404`, request.url));
        }

        // Check Tenant Status
        if (data.status === 'suspended') {
            // Rewrite to suspended page
            // We probably want to keep the tenant subdomain visible but show suspended content
            // Or if it's strictly Rewrite, we can rewrite to /suspended
            return NextResponse.rewrite(new URL(`/suspended`, request.url));
        }

        if (!res.ok) {
            return NextResponse.rewrite(new URL(`/404`, request.url));
        }

        // Feature Gating: Check 'Web' access
        // Default to TRUE if missing? No, user requested strict gating.
        // DB default is false.
        const features = data.subscription_features || {};
        if (features.web === false) {
            const protocol = url.protocol;
            const rootDomain = hostname.includes('localhost') ? 'localhost:3000' : 'hauze.tr';
            return NextResponse.redirect(`${protocol}//${rootDomain}`);
        }

        // Valid Tenant -> Rewrite
        return NextResponse.rewrite(new URL(`/tenant/${subdomain}${path}`, request.url));

    } catch (error) {
        console.error('Middleware API Error:', error);
        // Fail safe -> 404
        return NextResponse.rewrite(new URL(`/404`, request.url));
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
