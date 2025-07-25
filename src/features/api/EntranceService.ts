import axios from 'axios';
import { CreateEntrance } from '../class/Entrances';
import { BASE_URL_ENTRATE as API_URL } from '../../enum/RoutesEnum'; // Assicurati che questa costante esista

interface GetEntrancesParams {
  page?: number;
  pageSize?: number;
  orderBy: string;
  ascending?: boolean;
  userId: string;
}

// GET paginato con filtri
interface GetEntrancesParams {
  page?: number;
  pageSize?: number;
  orderBy: string;
  ascending?: boolean;
  userId: string;
  startDate?: Date | null;
  endDate?: Date | null;
  clienteId?: string | null;
}

// GET paginato con filtri
export const getEntrances = async (params: GetEntrancesParams) => {
  const queryParams: any = {
    userId: params.userId,
    orderBy: params.orderBy,
    ascending: params.ascending
  };

  if (params.page) queryParams.page = params.page;
  if (params.pageSize) queryParams.pageSize = params.pageSize;

  if (params.startDate) queryParams.startDate = params.startDate;
  if (params.endDate) queryParams.endDate = params.endDate;
  if (params.clienteId) queryParams.clientId = params.clienteId;

  const response = await axios.get(API_URL, { params: queryParams });

  return {
    entrances: response.data.items,
    totalCount: response.data.totalCount,
  };
};


// GET by ID
export const getEntranceById = async (id: string) => {
  const response = await axios.get(`${API_URL}/${id}`);
  return response.data;
};

// POST (Create)
export const createEntrance = async (entrance: CreateEntrance) => {
const payload = {
    dataOra: entrance.dataOra.toISOString(),
    clienteId: entrance.clienteId,
    userId:entrance.userId
  };

  const response = await axios.post(API_URL, payload, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return response.data;
};

// DELETE
export const deleteEntrance = async (id: string) => {
  await axios.delete(`${API_URL}/${id}`);
};
