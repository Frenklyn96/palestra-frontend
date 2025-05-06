import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { Tariffa } from '../class/Tariffa';
import * as settingsService from '../api/SettingsService';

// Stato iniziale
interface SettingsState {
  tariffe: Tariffa[];
  loading: boolean;
  error: string | null;
  foto: string | null
}

const initialState: SettingsState = {
  tariffe: [],
  loading: false,
  error: null,
  foto: null
};

// Thunk per ottenere tutte le tariffe
export const fetchTariffe = createAsyncThunk(
  'settings/fetchTariffe',
  async (_, thunkAPI) => {
    try {
      const tariffe = await settingsService.getTariffe();
      return tariffe;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

// Thunk per aggiungere una nuova tariffa
export const addTariffaAsync = createAsyncThunk(
  'settings/addTariffa',
  async (tariffa: Tariffa, thunkAPI) => {
    try {
      const newTariffa = await settingsService.addTariffa(tariffa);
      return newTariffa;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response.data.code);
    }
  }
);

// Thunk per aggiornare una tariffa esistente
export const updateTariffaAsync = createAsyncThunk(
  'settings/updateTariffa',
  async (tariffa: Tariffa, thunkAPI) => {
    try {
      const updatedTariffa = await settingsService.updateTariffa(tariffa);
      return updatedTariffa;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response.data.code);
    }
  }
);

// Thunk per rimuovere una tariffa
export const removeTariffaAsync = createAsyncThunk(
  'settings/removeTariffa',
  async (id: string, thunkAPI) => {
    try {
      await settingsService.removeTariffa(id);
      return id;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const uploadFotoAsync = createAsyncThunk(
  'settings/uploadFoto',
    async (file: String, thunkAPI) => {
      try {
        const uplaodFoto = await settingsService.uploadFoto(file);
        return uplaodFoto;
      } catch (error: any) {
        return thunkAPI.rejectWithValue(error.message);
      }
    }
);


export const getFotoHomeAsync = createAsyncThunk(
  'settings/getFotoHome',
    async (_,thunkAPI) => {
      try {
        const uplaodFoto = await settingsService.getFotoHome();
        return uplaodFoto;
      } catch (error: any) {
        return thunkAPI.rejectWithValue(error.message);
      }
    }
);

// Slice
const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setTariffe: (state, action: PayloadAction<Tariffa[]>) => {
      state.tariffe = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchTariffe
      .addCase(fetchTariffe.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTariffe.fulfilled, (state, action) => {
        state.loading = false;
        state.tariffe = action.payload;
      })
      .addCase(fetchTariffe.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // addTariffa
      .addCase(addTariffaAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addTariffaAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.tariffe.push(action.payload);
      })
      .addCase(addTariffaAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // updateTariffa
      .addCase(updateTariffaAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTariffaAsync.fulfilled, (state, action) => {
        state.loading = false;
        const updated = action.payload;
        const index = state.tariffe.findIndex(t => t.id === updated.id);
        if (index !== -1) {
          state.tariffe[index] = updated;
        }
      })
      .addCase(updateTariffaAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // removeTariffa
      .addCase(removeTariffaAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeTariffaAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.tariffe = state.tariffe.filter(t => t.id !== action.payload);
      })
      .addCase(removeTariffaAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(getFotoHomeAsync.fulfilled, (state, action)=> {
        state.foto = action.payload as string;
      });
  },
});

export const { setTariffe } = settingsSlice.actions;

export default settingsSlice.reducer;
