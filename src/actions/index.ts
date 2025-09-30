import { db } from '@/db/index';
import { links } from '@/db/schema';
import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const server = {
  createLink: defineAction({
    accept: 'form',
    input: z.object({
      originalUrl: z
        .string()
        .url('Invalid URL')
        .refine(
          (url) => {
            try {
              const urlObj = new URL(url);
              return (
                urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
              );
            } catch {
              return false;
            }
          },
          { message: 'URL must start with http:// or https://' }
        ),
      shortCode: z.string().min(3).max(10).optional(),
    }),
    handler: async (input) => {
      try {
        // 1. Verificar si la URL ya existe (prevenir duplicados)
        const existingUrl = await db
          .select()
          .from(links)
          .where(eq(links.originalUrl, input.originalUrl));

        if (existingUrl.length > 0) {
          throw new ActionError({
            code: 'CONFLICT',
            message: `Esta URL ya tiene un enlace acortado: /${existingUrl[0].shortCode}`,
          });
        }

        // 2. Generar o validar el shortCode
        let finalShortCode = input.shortCode;

        if (!finalShortCode) {
          finalShortCode = nanoid(8);
        }

        // 3. Verificar si el shortCode ya existe
        const existingShortCode = await db
          .select()
          .from(links)
          .where(eq(links.shortCode, finalShortCode));

        if (existingShortCode.length > 0) {
          throw new ActionError({
            code: 'BAD_REQUEST',
            message: 'Este código personalizado ya está en uso. Elige uno diferente.',
          });
        }

        const [newLink] = await db
          .insert(links)
          .values({
            originalUrl: input.originalUrl,
            shortCode: finalShortCode,
            isCustom: !!input.shortCode,
          }).returning();
        return newLink;
      } catch (error) {
        if (error instanceof ActionError) {
          throw error;
        }
        throw new ActionError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create link',
        });
      }
    },
  }),
  getLinks: defineAction({
    accept: 'json',
    handler: async () => {
      try {
        const allLinks = await db
          .select({
            id: links.id,
            originalUrl: links.originalUrl,
            shortCode: links.shortCode,
            clickCount: links.clickCount,
          })
          .from(links)
          .orderBy(links.createdAt);

        return allLinks;
      } catch (error) {
        throw new ActionError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch links',
        });
      }
    },
  }),
};
