import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Cliente, CreateCliente, RenewAbbonamneto } from '../class/Cliente';
import * as clienteApi from '../api/ClienteService'; // servizio API per chiamate backend

// Stato iniziale
interface ClientiState {
  clienti: Cliente[];
  loading: boolean;
  selectedCliente: Cliente | null;
  totalCount: number;
  loadingSelectedCliente: boolean;
  numberMembers: number;

}

const initialState: ClientiState = {
  clienti: [],
  loading: false,
  selectedCliente: null,  
  totalCount: 0,
  loadingSelectedCliente: false,
  numberMembers: 0
};

// Thunk: carica clienti da backend
export const fetchClienti = createAsyncThunk('clienti/fetchClienti', 
  async (
      params: {
        page?: number;
        pageSize?: number;
        orderBy: string;
        ascending?: boolean;
        userId:string;
      },
      thunkAPI
    ) => {
      try {
        const result = await clienteApi.getClienti(params);
        return result;
      } catch (err: any) {
        return thunkAPI.rejectWithValue(err.message);
      }
    }
  );

export const fetchClienteById = createAsyncThunk(
  'clienti/fetchClienteById',
  async (id: string) => {
    return await clienteApi.getClienteById(id);
  }
);

export const fetchClientiAbbondamentoScaduto = createAsyncThunk(
  'clienti/fetchClientiAbbondamentoScaduto',
  async (userId:string) => {
    return await clienteApi.fetchClientiAbbondamentoScaduto(userId);
  }
);

// Thunk: crea cliente
export const createClienteAsync = createAsyncThunk(
  'clienti/createCliente',
  async (cliente: CreateCliente) => {
    return await clienteApi.createCliente(cliente);
  }
);

// Thunk: aggiorna cliente
export const updateClienteAsync = createAsyncThunk(
  'clienti/updateCliente',
  async (cliente: Cliente,) => {
    return await clienteApi.updateCliente(cliente.id, cliente);
  }
);

// Thunk: elimina cliente
export const deleteClienteAsync = createAsyncThunk(
  'clienti/deleteCliente',
  async (id: string) => {
    await clienteApi.deleteCliente(id);
    return id;
  }
);

export const eliminaRinnovo = createAsyncThunk(
  'clienti/eliminaRinnovo',
  async (id: string) => {
    await clienteApi.eliminaRinnovo(id);
    return id;
  }
);


export const renewAbbonamentoAsync = createAsyncThunk(
  'clienti/updateClienteAbbonamento',
  async (data: RenewAbbonamneto,) => {
    return await clienteApi.renewAbbonamento(data);
  }
);

export const getNumberMembersAsync = createAsyncThunk(
  'clienti/getNumberMembers',
    async (_,thunkAPI) => {
      try {
        const number = await clienteApi.getNumberMembers();
        return number;
      } catch (error: any) {
        return thunkAPI.rejectWithValue(error.message);
      }
    }
);

// Slice
const clientiSlice = createSlice({
  name: 'clienti',
  initialState,
  reducers: {
    setClienti: (state, action: PayloadAction<Cliente[]>) => {
      state.clienti = action.payload;
    },
    removeCliente: (state, action: PayloadAction<string>) => {
      state.clienti = state.clienti.filter(cliente => cliente.id !== action.payload);
    },
    updateCliente: (state, action: PayloadAction<Cliente>) => {
      const index = state.clienti.findIndex(cliente => cliente.id === action.payload.id);
      if (index !== -1) {
        state.clienti[index] = action.payload;
      }
    },
    selectCliente: (state, action: PayloadAction<Cliente | null>) => {
      state.selectedCliente = action.payload;
    },
    removeSelectCliente: (state) => {
      state.selectedCliente = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClienti.pending, (state) => {
        state.loading = true;
      })
      builder.addCase(fetchClienti.fulfilled, (state, action) => {
        state.clienti = action.payload.clienti;
        state.totalCount = action.payload.totalCount;
        state.loading = false;
      })

      .addCase(fetchClienti.rejected, (state) => {
        state.loading = false;
      })

      .addCase(createClienteAsync.fulfilled, (state, action) => {
        state.clienti.push(action.payload);
      })

      .addCase(updateClienteAsync.fulfilled, (state, action) => {
        const index = state.clienti.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.clienti[index] = action.payload;
        }
      })

      .addCase(deleteClienteAsync.fulfilled, (state, action) => {
        state.clienti = state.clienti.filter(c => c.id !== action.payload);
      })

      .addCase(eliminaRinnovo.fulfilled, (state, action) => {
        state.clienti = state.clienti.filter(c => c.id !== action.payload);
      })
      .addCase(fetchClienteById.pending, (state) => {
        state.loadingSelectedCliente = true;
      })
      .addCase(fetchClienteById.fulfilled, (state, action)=>{
        state.selectedCliente = action.payload;
        state.loadingSelectedCliente = false;
      })
      .addCase(getNumberMembersAsync.fulfilled, (state, action)=> {
        state.numberMembers = action.payload as number;
      });

  },
});

export const { setClienti, removeCliente, updateCliente, selectCliente,removeSelectCliente } = clientiSlice.actions;
export default clientiSlice.reducer;
