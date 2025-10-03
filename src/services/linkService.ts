// Service Layer: Lógica de negocio
// Responsabilidad: Validaciones, reglas de negocio, orquestación

import { nanoid } from 'nanoid';
import { linkRepository } from '@/repositories/linkRepository';
import type { CreateLinkDTO, Link, LinkSummary } from '@/types/link';

// Errores de negocio personalizados
export class LinkServiceError extends Error {
  constructor(
    message: string,
    public code: 'CONFLICT' | 'BAD_REQUEST' | 'NOT_FOUND' | 'INTERNAL_SERVER_ERROR'
  ) {
    super(message);
    this.name = 'LinkServiceError';
  }
}

export class LinkService {
  /**
   * Crea un nuevo enlace acortado
   * Reglas de negocio:
   * - La URL no debe estar duplicada
   * - El shortCode personalizado no debe estar en uso
   * - Si no hay shortCode, se genera automáticamente
   */
  async createLink(data: CreateLinkDTO): Promise<Link> {
    try {
      // 1. Verificar si la URL ya existe
      const existingUrl = await linkRepository.findByOriginalUrl(
        data.originalUrl
      );

      if (existingUrl) {
        throw new LinkServiceError('Esta URL ya está registrada', 'CONFLICT');
      }

      // 2. Determinar el shortCode
      let finalShortCode = data.shortCode;

      if (!finalShortCode) {
        // Generar código automático
        finalShortCode = await this.generateUniqueShortCode();
      } else {
        // Validar que el código personalizado no exista
        const existingShortCode = await linkRepository.findByShortCode(
          finalShortCode
        );

        if (existingShortCode) {
          throw new LinkServiceError(
            'Este código personalizado ya está en uso. Elige uno diferente.',
            'BAD_REQUEST'
          );
        }
      }

      // 3. Crear el link
      const newLink = await linkRepository.create({
        originalUrl: data.originalUrl,
        shortCode: finalShortCode,
      });

      return newLink;
    } catch (error) {
      // Re-lanzar errores de negocio
      if (error instanceof LinkServiceError) {
        throw error;
      }

      // Capturar errores inesperados
      throw new LinkServiceError(
        'Error al crear el enlace',
        'INTERNAL_SERVER_ERROR'
      );
    }
  }

  /**
   * Genera un shortCode único
   * Intenta hasta 3 veces antes de fallar
   */
  private async generateUniqueShortCode(
    maxAttempts = 3
  ): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      const candidate = nanoid(8);
      const existing = await linkRepository.findByShortCode(candidate);

      if (!existing) {
        return candidate;
      }
    }

    throw new LinkServiceError(
      'No se pudo generar un código único',
      'INTERNAL_SERVER_ERROR'
    );
  }

  /**
   * Obtiene todos los enlaces
   */
  async getAllLinks(): Promise<LinkSummary[]> {
    try {
      return await linkRepository.findAll();
    } catch (error) {
      throw new LinkServiceError(
        'Error al obtener enlaces',
        'INTERNAL_SERVER_ERROR'
      );
    }
  }
}

// Singleton instance
export const linkService = new LinkService();
