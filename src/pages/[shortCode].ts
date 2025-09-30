import { db } from '@/db/index';
import { links } from '@/db/schema';
import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';

export const GET: APIRoute = async ({ params, redirect }) => {
  try {
    const { shortCode } = params;

    if (!shortCode) {
      return new Response('Short code not provided', { status: 400 });
    }

    // Buscar el enlace en la base de datos
    const [link] = await db
      .select()
      .from(links)
      .where(eq(links.shortCode, shortCode));

    if (!link) {
      return new Response('Link not found', { status: 404 });
    }

    // Incrementar el contador de clicks
    await db
      .update(links)
      .set({
        clickCount: link.clickCount + 1,
      })
      .where(eq(links.id, link.id));

    // Redirigir a URL original
    return redirect(link.originalUrl, 302);
  } catch (error) {
    console.error('Error redirecting:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};
