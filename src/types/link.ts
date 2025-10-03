// Tipos compartidos para el dominio Link

export interface Link {
  id: number;
  originalUrl: string;
  shortCode: string;
  isCustom: boolean | null;
  createdAt: Date | null;
  clickCount: number;
}

export interface CreateLinkDTO {
  originalUrl: string;
  shortCode?: string;
}

export interface LinkSummary {
  id: number;
  originalUrl: string;
  shortCode: string;
}
