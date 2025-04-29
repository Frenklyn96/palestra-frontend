import axios from 'axios';
import { Cliente, CreateCliente } from '../class/Cliente';
import { BASE_URL_CLIENTI as API_URL} from '../../enum/RoutesEnum';


interface GetClientiParams {
  page?: number;
  pageSize?: number;
  orderBy: string;
  ascending?: boolean;
}
export const getClienti = async ( params:GetClientiParams) => {
  const queryParams: any = {};

  
  if (params.page) queryParams.page = params.page;
  if (params.pageSize) queryParams.pageSize = params.pageSize;
  if (params.orderBy) queryParams.orderBy = params.orderBy;
  queryParams.ascending = params.ascending;

  const response = await axios.get(API_URL, { params: queryParams });

  return {
    clienti: response.data.items,
    totalCount: response.data.totalCount,
  };
};

export const getClienteById = async (id: string) => {
  const response = await axios.get(`${API_URL}/${id}`);
  return response.data;
};

export const createCliente = async (cliente: CreateCliente) => {
  const response = await axios.post(API_URL, cliente);
  return response.data;
};

export const updateCliente = async (id: string, cliente: Cliente) => {
  const response = await axios.put(`${API_URL}/${id}`, cliente);
  return response.data;
};

export const deleteCliente = async (id: string) => {
  await axios.delete(`${API_URL}/${id}`);
};

export const fetchClientiAbbondamentoScaduto = async() => {
  const response = await axios.get(API_URL+"/AbbonamentoScaduto");
  return response.data;
}

export const rinnovaTutti = async(clienti: Cliente[]) => {
  const response = await axios.get(`${API_URL}/rinnovaTutti`, { params: { clienti } });
  return response.data;
}


export async function eliminaRinnovo(id: string) {
  await axios.delete(`${API_URL}/EliminaRinnovo/${id}`);
}

