// src/features/transazioni/Transazione.ts
export interface Transazione {
    id: string;
    dataTransazione: Date;
    metodoPagamento: string;
    importo: number;
    causale:string
    clienteId: string|null;
    clienteNome:string;
  }
  

  // src/features/transazioni/Transazione.ts
export interface CreateTransazione {
  dataTransazione: Date;
  metodoPagamento: string;
  importo: number;
  causale:string
  clienteId: string|null;
}