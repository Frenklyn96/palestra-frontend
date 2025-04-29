export interface Cliente {
    id: string;
    nome: string;
    cognome: string;
    numeroTessera: string;
    scadenza: Date|null;
    email: string;
    dataNascita: Date|null;
    telefono: string;
    foto: string;
    tariffaNome: string;
  }

export interface  CreateCliente {
  nome: string;
  cognome: string;
  numeroTessera: string;
  scadenza: Date  |null;
  email: string;
  dataNascita: Date |null;
  telefono: string;
  foto: string;
  tariffaNome: string;
}
  