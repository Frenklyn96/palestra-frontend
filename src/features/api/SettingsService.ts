import axios from "axios";
import { Tariffa } from "../class/Tariffa";
import { BASE_URL_TARIFFE as API_URL } from "../../enum/RoutesEnum";
import { BASE_URL_UTILITY } from "../../enum/RoutesEnum";

// Funzione per ottenere tutte le tariffe
export const getTariffe = async (userId: string) => {
  const response = await axios.get(API_URL, {
    params: {
      userId: userId,
    },
    headers: {
      "Content-Type": "application/json",
    },
  });

  return response.data;
};

// Funzione per aggiungere una nuova tariffa
export const addTariffa = async (tariffa: Tariffa) => {
  const response = await axios.post(
    API_URL,
    {
      nome: tariffa.nome,
      durata: tariffa.durata,
      unitaDurata: tariffa.unitaDurata,
      costo: tariffa.costo,
      userId: tariffa.userId,
      toCount: tariffa.toCount ?? false,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
  return response.data;
};

// Funzione per rimuovere una tariffa
export const removeTariffa = async (id: string) => {
  const response = await axios.delete(`${API_URL}/${id}`);
  return response.data;
};

// Funzione per aggiornare una tariffa
export const updateTariffa = async (tariffa: Tariffa) => {
  const response = await axios.put(
    `${API_URL}/${tariffa.id}`,
    {
      nome: tariffa.nome,
      durata: tariffa.durata,
      unitaDurata: tariffa.unitaDurata,
      costo: tariffa.costo,
      userId: tariffa.userId,
      toCount: tariffa.toCount ?? false,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
  return response.data;
};

export const uploadFoto = async (file: String) => {
  const formData = new FormData();

  if (file && file.startsWith("data:image")) {
    const byteString = atob(file.split(",")[1]);
    const mimeString = file.split(",")[0].split(":")[1].split(";")[0];

    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    const blob = new Blob([ab], { type: mimeString });
    formData.append("file", blob, "foto.jpg"); // CAMBIATO "foto" → "file"
  }

  const response = await axios.post(
    `${BASE_URL_UTILITY}/UploadHomeImage`,
    formData,
  );
  return response.data;
};

export const getFotoHome = async () => {
  const response = await axios.get(`${BASE_URL_UTILITY}/GetHomeImage`);
  return response.data.foto;
};

export const uploadTariffaTemplate = async (tariffaId: string, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await axios.post(
    `${API_URL}/${tariffaId}/template`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return response.data;
};

export const deleteTariffaTemplate = async (tariffaId: string) => {
  await axios.delete(`${API_URL}/${tariffaId}/template`);
};

export const saveTariffaTemplateFields = async (
  tariffaId: string,
  fieldsJson: string,
) => {
  const response = await axios.put(
    `${API_URL}/${tariffaId}/template-fields`,
    { fieldsJson },
    { headers: { "Content-Type": "application/json" } },
  );
  return response.data;
};

export const getTariffaTemplateImage = async (
  tariffaId: string,
): Promise<Blob> => {
  const response = await axios.get<Blob>(
    `${API_URL}/${tariffaId}/template-image`,
    { responseType: "blob" },
  );
  return response.data;
};
