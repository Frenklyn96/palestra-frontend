import axios from 'axios';
import { Tariffa } from '../class/Tariffa';
import {  BASE_URL_TARIFFE as API_URL } from '../../enum/RoutesEnum';

// Funzione per ottenere tutte le tariffe
export const getTariffe = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

// Funzione per aggiungere una nuova tariffa
export const addTariffa = async (tariffa: Tariffa) => {
  const response = await axios.post(API_URL, 
    {
        nome: tariffa.nome,
        durata: tariffa.durata,
        unitaDurata: tariffa.unitaDurata,
        costo: tariffa.costo
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
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
  const response = await axios.put(`${API_URL}/${tariffa.id}`, 
    {
        nome: tariffa.nome,
        durata: tariffa.durata,
        unitaDurata: tariffa.unitaDurata,
        costo: tariffa.costo
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
};
