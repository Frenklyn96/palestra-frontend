import axios from 'axios';
import { CreateTransazione, Transazione } from '../class/Transazione';
import { BASE_URL_TRANSAZIONI as API_URL} from '../../enum/RoutesEnum';


interface GetTransazioniParams {
  startDate: Date | null;
  endDate: Date | null;
  page?: number;
  pageSize?: number;
  orderBy: string;
  ascending?: boolean;
  clienteId?: string | null;
  userId:string;
}

export const getTransazioni = async (params: GetTransazioniParams) => {
  const queryParams: any = {};

  queryParams.userId= params.userId;
  if (params.startDate) queryParams.startDate = params.startDate;
  if (params.endDate) queryParams.endDate = params.endDate;
  if (params.page) queryParams.page = params.page;
  if (params.pageSize) queryParams.pageSize = params.pageSize;
  if (params.orderBy) queryParams.orderBy = params.orderBy;
  queryParams.ascending = params.ascending;
  queryParams.clienteId = params.clienteId;

  const response = await axios.get(API_URL, { params: queryParams });

  return {
    transazioni: response.data.items,
    totalCount: response.data.totalCount,
  };
};

export const getTransazioneById = async (id: string) => {
  const response = await axios.get(`${API_URL}/${id}`);
  return response.data;
};

export const createTransazione = async (transazione: CreateTransazione) => {
  const payload = {
    dataTransazione: transazione.dataTransazione.toISOString(),  // converte la data a formato ISO
    metodoPagamento: transazione.metodoPagamento,
    importo: transazione.importo,
    causale: transazione.causale,
    clienteId: transazione.clienteId || null,
    userId:transazione.userId // può essere anche null
  };

  console.log('Payload inviato (create):', payload);

  const response = await axios.post(API_URL, payload, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return response.data;
};

export const updateTransazione = async (id: string, transazione: Transazione) => {
  const payload = {
    id: transazione.id,  // Assicurati che 'id' sia un GUID valido
    dataTransazione: transazione.dataTransazione.toISOString(), // Converte la data in formato ISO
    metodoPagamento: transazione.metodoPagamento,
    importo: transazione.importo,
    causale: transazione.causale,
    clienteId: transazione.clienteId || null, // Se clienteId è null, lascialo così
    clienteNome: transazione.clienteNome || null, 
    userId: transazione.userId// Può essere anche null o una stringa vuota
  };

  // Aggiungi il log per vedere il payload
  console.log('Payload inviato (update):', payload); // Debug

  // Invia la richiesta di aggiornamento
  const response = await axios.put(`${API_URL}/${id}`, payload);

  return response.data;
};


export const deleteTransazione = async (id: string) => {
  await axios.delete(`${API_URL}/${id}`);
};
