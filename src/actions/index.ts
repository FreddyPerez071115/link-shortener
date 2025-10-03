// Actions Layer: Capa delgada de presentación
// Responsabilidad: Validación de entrada + mapeo de errores

import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { linkService, LinkServiceError } from '@/services/linkService';

// Schema de validación reutilizable
const createLinkSchema = z.object({
  originalUrl: z
    .string()
    .url('URL inválida')
    .refine(
      (url) => {
        try {
          const urlObj = new URL(url);
          return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
          return false;
        }
      },
      { message: 'La URL debe comenzar con http:// o https://' }
    ),
  shortCode: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .max(10, 'Máximo 10 caracteres')
    .regex(
      /^[a-zA-Z0-9-]+$/,
      'Solo letras, números y guiones permitidos'
    )
    .optional(),
});

export const server = {
  createLink: defineAction({
    accept: 'form',
    input: createLinkSchema,
    handler: async (input) => {
      try {
        // Delegar la lógica al servicio
        const newLink = await linkService.createLink(input);
        return newLink;
      } catch (error) {
        // Mapear errores del servicio a errores de Astro Actions
        if (error instanceof LinkServiceError) {
          throw new ActionError({
            code: error.code,
            message: error.message,
          });
        }

        // Error inesperado
        throw new ActionError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error al crear el enlace',
        });
      }
    },
  }),

  getLinks: defineAction({
    accept: 'json',
    handler: async () => {
      try {
        // Delegar al servicio
        const links = await linkService.getAllLinks();
        return links;
      } catch (error) {
        if (error instanceof LinkServiceError) {
          throw new ActionError({
            code: error.code,
            message: error.message,
          });
        }

        throw new ActionError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error al obtener enlaces',
        });
      }
    },
  }),
};
