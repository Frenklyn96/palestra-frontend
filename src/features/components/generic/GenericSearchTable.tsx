import React, { useEffect } from 'react';
import { TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../../store/store';  // Importa AppDispatch
import { searchGenericAsync } from '../../slice/genericSlice';  // La tua azione asincrona

interface GenericSearchTableProps {
  tableName: string;
  searchTerm: string; 
  setSearchTerm: (term: string) => void;
  page: number; // Numero di pagina
  pageSize: number; // Dimensione della pagina
  orderBy: string; // Colonna per ordinare
  orderDirection: 'asc' | 'desc'; // Direzione dell'ordinamento
}

export enum TableNames {
  CLIENTI = 'Clienti',
  TRANSAZIONI = 'Transazioni',
  CLIENTIRICERCATRANSAZIONE = 'ClientiRicercaTransazione',
  // Aggiungi altri nomi di tabelle qui
}

const GenericSearchTable: React.FC<GenericSearchTableProps> = ({
  tableName,
  searchTerm,
  setSearchTerm,
  page,
  pageSize,
  orderBy,
  orderDirection
}) => {
  const dispatch = useDispatch<AppDispatch>();  // Tipizza il dispatch

  // Gestisci la ricerca
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  useEffect(() => {
    const fetchData = async () => {
      // Chiamata all'azione asincrona con tutti i parametri
      await dispatch(
        searchGenericAsync({
          tableName,
          searchTerm,
          page,
          pageSize,
          orderBy,
          orderDirection
        })
      );  
    };

    if (searchTerm) {
      fetchData();
    }
  }, [searchTerm, tableName, page, pageSize, orderBy, orderDirection]);

  return (
    <TextField
      size="small"
      placeholder="Cerca..."
      value={searchTerm}
      onChange={handleSearch}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon />
          </InputAdornment>
        ),
      }}
    />
  );
};

export default GenericSearchTable;
