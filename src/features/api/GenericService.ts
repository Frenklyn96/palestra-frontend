import axios from 'axios';
import { BASE_URL_GENERIC as API_URL } from '../../enum/RoutesEnum';

export const searchGeneric = async (
  tableName: string, 
  searchTerm: string, 
  pageNumber: number|null, 
  pageSize: number|null, 
  orderByColumn: string|null, 
  orderDirection: 'asc' | 'desc'
) => {
  // Chiamata HTTP
  const response = await axios.get(`${API_URL}/search`, {
    params: {
      tableName,
      searchTerm,
      pageNumber,
      pageSize,
      orderByColumn,
      orderDirection: orderDirection === 'asc'
    },
  });

  // La risposta dovrebbe contenere data con items, totalCount, page
  return {
    data: response.data.data,           // I risultati della ricerca (array)
    totalCount: response.data.totalCount, // Numero totale di risultati
  };
};
