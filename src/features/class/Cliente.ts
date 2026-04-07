export interface Cliente {
  id: string;
  nome: string;
  cognome: string;
  numeroTessera: string;
  scadenza: Date | null;
  email: string;
  dataNascita: Date | null;
  telefono: string;
  foto: string;
  tariffaNome: string;
  note?: string;
  userId: string;
  ingressiResidui?: number;
  giorniTariffa?: number;
}

export interface CreateCliente {
  nome: string;
  cognome: string;
  numeroTessera: string;
  scadenza: Date | null;
  email: string;
  dataNascita: Date | null;
  telefono: string;
  foto: string;
  tariffaNome: string;
  note?: string;
  userId: string;
}

export interface RenewAbbonamneto {
  clienteId: string;
  tariffaNome: string;
  userId: string;
  scadenza: Date | null;
}
