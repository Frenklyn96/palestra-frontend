// src/features/transazioni/transazioneSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { CreateTransazione, Transazione } from '../../features/class/Transazione';
import { getTransazioni, createTransazione, updateTransazione, deleteTransazione } from '../../features/api/TransazioneService'; // Importa direttamente dal service

interface TransazioniState {
  transazioni: Transazione[];
  loading: boolean;
  error: string | null;
  totalCount: number; // Aggiungi la proprietà totalCount
}

const initialState: TransazioniState = {
  transazioni: [],
  loading: true,
  error: null,
  totalCount: 0, 
};

// === Thunk Async Actions ===

export const fetchTransazioni = createAsyncThunk(
  'transazioni/fetchAll',
  async (
    params: {
      startDate: Date | null;
      endDate: Date | null;
      page?: number;
      pageSize?: number;
      orderBy: string;
      ascending?: boolean;
      clienteId?: string | null;
      userId:string;
    },
    thunkAPI
  ) => {
    try {
      const result = await getTransazioni(params);
      return result;
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);


export const createTransazioneAsync = createAsyncThunk(
  'transazioni/create',
  async (transazione: CreateTransazione, thunkAPI) => {
    try {
      return await createTransazione(transazione);
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

export const updateTransazioneAsync = createAsyncThunk(
  'transazioni/update',
  async (transazione: Transazione, thunkAPI) => {
    try {
      return await updateTransazione(transazione.id, transazione); // Passa l'ID per aggiornare
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

export const deleteTransazioneAsync = createAsyncThunk(
  'transazioni/delete',
  async (id: string, thunkAPI) => {
    try {
      await deleteTransazione(id); // Effettua la delete
      return id; // Restituisci solo l'ID per rimuoverlo dallo stato
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

// === Slice ===

const transazioniSlice = createSlice({
  name: 'transazioni',
  initialState,
  reducers: {
    setTransazioni: (state, action: PayloadAction<Transazione[]>) => {
      state.transazioni = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // FETCH
      .addCase(fetchTransazioni.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransazioni.fulfilled, (state, action) => {
        state.transazioni = action.payload.transazioni;
        state.totalCount = action.payload.totalCount; // Salva il totalCount
        state.loading = false;
      })
      .addCase(fetchTransazioni.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // CREATE
      .addCase(createTransazioneAsync.fulfilled, (state, action) => {
        state.transazioni.push(action.payload);
      })

      // UPDATE
      .addCase(updateTransazioneAsync.fulfilled, (state, action) => {
        const index = state.transazioni.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.transazioni[index] = action.payload;
        }
      })

      // DELETE
      .addCase(deleteTransazioneAsync.fulfilled, (state, action) => {
        state.transazioni = state.transazioni.filter(t => t.id !== action.payload);
      });
  },
});

export const { setTransazioni } = transazioniSlice.actions;
export default transazioniSlice.reducer;
