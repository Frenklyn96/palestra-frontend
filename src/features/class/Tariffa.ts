// src/features/class/Tariffa.ts

export interface Tariffa {
    id: string;
    nome: string;
    durata: number;
    unitaDurata: UnitaDurata;
    costo: number;
  }

export enum UnitaDurata {
    Giorni = 'Giorni',
    Settimane = 'Settimana',
    Mesi = 'Mesi',
    Anni = 'Anni'
  }
  