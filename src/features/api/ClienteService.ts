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
  const formData = new FormData();

  // Aggiungi sempre tutti i campi
  formData.append("nome", cliente.nome || "");
  formData.append("cognome", cliente.cognome || "");
  formData.append("numeroTessera", cliente.numeroTessera || "");
  formData.append("email", cliente.email || "");
  formData.append("telefono", cliente.telefono || "");
  formData.append("tariffaNome", cliente.tariffaNome || "");

  if (cliente.dataNascita)
    formData.append("dataNascita",  new Date(cliente.dataNascita).toDateString());

  if (cliente.scadenza)
    formData.append("scadenza",  new Date(cliente.scadenza).toDateString());

  // Gestione della foto se presente
  if (cliente.foto && cliente.foto.startsWith("data:image")) {
    const byteString = atob(cliente.foto.split(",")[1]);
    const mimeString = cliente.foto.split(",")[0].split(":")[1].split(";")[0];

    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    const blob = new Blob([ab], { type: mimeString });
    formData.append("foto", blob, "foto.jpg");
  }

  const response = await axios.post(API_URL, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};


export const updateCliente = async (id: string, cliente: Cliente) => {
  const formData = new FormData();

  formData.append("nome", cliente.nome);
  formData.append("cognome", cliente.cognome);
  formData.append("numeroTessera", cliente.numeroTessera);
  formData.append("email", cliente.email);
  formData.append("telefono", cliente.telefono);
  formData.append("tariffaNome", cliente.tariffaNome);

  if (cliente.dataNascita)
    formData.append("dataNascita",  new Date(cliente.dataNascita).toDateString());

  if (cliente.scadenza)
    formData.append("scadenza",  new Date(cliente.scadenza).toDateString());

  // Foto: da base64 a Blob
  if (cliente.foto && cliente.foto.startsWith("data:image")) {
    const byteString = atob(cliente.foto.split(",")[1]);
    const mimeString = cliente.foto.split(",")[0].split(":")[1].split(";")[0];

    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    const blob = new Blob([ab], { type: mimeString });
    formData.append("foto", blob, "foto.jpg");
  }

  const response = await axios.put(`${API_URL}/${id}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });

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

