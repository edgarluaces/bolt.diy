import type { LoaderFunctionArgs } from '@remix-run/cloudflare';

/**
 * This route handles Chrome DevTools discovery requests
 * Chrome looks for this endpoint to detect developer tools configuration
 * We return 404 to indicate no special configuration is available
 */
export async function loader({ request: _request }: LoaderFunctionArgs) {
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
