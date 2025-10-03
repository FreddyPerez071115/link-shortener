// Repository Pattern: Capa de acceso a datos
// Responsabilidad: Solo operaciones CRUD en la base de datos

import { db } from '@/db/index';
import { links } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { CreateLinkDTO, Link, LinkSummary } from '@/types/link';

export class LinkRepository {
  /**
   * Busca un link por URL original
   */
  async findByOriginalUrl(url: string): Promise<Link | null> {
    const result = await db
      .select()
      .from(links)
      .where(eq(links.originalUrl, url))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Busca un link por código corto
   */
  async findByShortCode(shortCode: string): Promise<Link | null> {
    const result = await db
      .select()
      .from(links)
      .where(eq(links.shortCode, shortCode))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Crea un nuevo link
   */
  async create(data: CreateLinkDTO & { shortCode: string }): Promise<Link> {
    const [newLink] = await db
      .insert(links)
      .values({
        originalUrl: data.originalUrl,
        shortCode: data.shortCode,
        isCustom: !!data.shortCode,
      })
      .returning();

    return newLink;
  }

  /**
   * Obtiene todos los links (resumen)
   */
  async findAll(): Promise<LinkSummary[]> {
    const allLinks = await db
      .select({
        id: links.id,
        originalUrl: links.originalUrl,
        shortCode: links.shortCode,
      })
      .from(links)
      .orderBy(links.createdAt);

    return allLinks;
  }
}

// Singleton instance
export const linkRepository = new LinkRepository();
