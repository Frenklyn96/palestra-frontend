import { Cliente } from "./Cliente";

export interface Entrance {
  id: string;
  dataOra: Date;
  clienteId: string;
  cliente?: Cliente;
  userId:string
}

export interface CreateEntrance {
    dataOra: Date;
    clienteId: string;
    userId:string
}