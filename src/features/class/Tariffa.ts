// src/features/class/Tariffa.ts

export interface TemplateField {
  key: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  bold: boolean;
  width: number;
  height: number;
}

export interface Tariffa {
  id: string;
  nome: string;
  durata: number;
  unitaDurata: UnitaDurata;
  costo: number;
  userId: string;
  toCount: boolean;
  hasTemplate?: boolean;
  templateFieldsJson?: string;
}

export enum UnitaDurata {
  Giorni = "Giorni",
  Settimane = "Settimana",
  Mesi = "Mesi",
  Anni = "Anni",
}
