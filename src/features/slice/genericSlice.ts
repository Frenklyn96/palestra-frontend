import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as genericApi from '../api/GenericService';

// Tipizzazione dello stato
interface GenericState<T> {
  results: T[];
  loading: boolean;
  totalCount: number;
  currentPage: number;
}

// Stato iniziale con valori generici
const initialState: GenericState<any> = {
  results: [],
  loading: false,
  totalCount: 0,
  currentPage: 1,
};

// Thunk per eseguire la ricerca generica
export const searchGenericAsync = createAsyncThunk(
  'generic/search',
  async (
    {
      tableName, 
      searchTerm, 
      page, 
      pageSize, 
      orderBy, 
      orderDirection,
      userId
    }: { 
      tableName: string; 
      searchTerm: string; 
      page: number|null; 
      pageSize: number|null; 
      orderBy: string|null; 
      orderDirection: 'asc' | 'desc';
      userId:string;
    }, 
    { rejectWithValue }
  ) => {
    try {
      const response = await genericApi.searchGeneric(
        tableName, 
        searchTerm, 
        page, 
        pageSize, 
        orderBy, 
        orderDirection,
        userId
      );
      
      // Assumiamo che la risposta contenga i dati necessari per la paginazione
      return(response);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);


// Creazione dello slice
const genericSlice = createSlice({
  name: 'generic',
  initialState,
  reducers: {
    // Azione per cancellare i risultati
    clearResults: (state) => {
      state.results = [];
    },
    updateResult: (state, action: PayloadAction<any[]>) => {
      state.results = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchGenericAsync.pending, (state) => {
        state.loading = true; // Stato di caricamento true durante la chiamata API
      })
      .addCase(searchGenericAsync.fulfilled, (state, action: PayloadAction<{ data: any[]; totalCount: number }>) => {
        state.loading = false;
        state.results = action.payload.data;  // Assegna i dati della ricerca
        state.totalCount = action.payload.totalCount;  // Numero totale dei risultati
      })
      .addCase(searchGenericAsync.rejected, (state) => {
        state.loading = false;  // Stato di caricamento false in caso di errore
      });
  },
});

// Esportazione delle azioni
export const { clearResults,updateResult } = genericSlice.actions;

// Esportazione del reducer
export default genericSlice.reducer;
