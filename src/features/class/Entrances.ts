
export interface Entrance {
  id: string;
  dataOra: Date;
  clienteId: string;
  clienteName?: string;
  userId:string
}

export interface CreateEntrance {
    dataOra: Date;
    clienteId: string;
    userId:string
}