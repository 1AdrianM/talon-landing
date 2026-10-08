import type { APIRoute } from 'astro';

// Contract (not yet wired to a backend):
// POST /api/waitlist
// Body: { email: string; source?: 'hero' | 'resultado' | 'pricing' }
// 200: { ok: true }
// 400: { error: string }
// 500: { error: string }

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email } = await request.json() as { email?: string };

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Email inválido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // TODO: persist to Supabase leads table / POST /leads on backend
    console.log('[waitlist] email captured (stub):', email);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Error interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
