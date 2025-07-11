import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { CreateEntrance, Entrance } from '../class/Entrances';
import * as entranceApi from '../api/EntranceService'; 

interface EntrancesState {
  entrances: Entrance[];
  loading: boolean;
  totalCount: number;
  selectedEntrance: Entrance | null;
}

const initialState: EntrancesState = {
  entrances: [],
  loading: false,
  totalCount: 0,
  selectedEntrance: null,
};

// Async thunk: fetch entrances
export const fetchEntrances = createAsyncThunk(
  'entrances/fetchEntrances',
  async (
    params: {
      page?: number;
      pageSize?: number;
      orderBy: string;
      ascending?: boolean;
      userId: string;
    },
    thunkAPI
  ) => {
    try {
      const result = await entranceApi.getEntrances(params);
      return result;
    } catch (err: any) {
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

// Async thunk: fetch entrance by ID
export const fetchEntranceById = createAsyncThunk(
  'entrances/fetchEntranceById',
  async (id: string) => {
    return await entranceApi.getEntranceById(id);
  }
);

// Async thunk: create entrance
export const createEntranceAsync = createAsyncThunk(
  'entrances/createEntrance',
  async (entrance: CreateEntrance) => {
    return await entranceApi.createEntrance(entrance);
  }
);

// Async thunk: delete entrance
export const deleteEntranceAsync = createAsyncThunk(
  'entrances/deleteEntrance',
  async (id: string) => {
    await entranceApi.deleteEntrance(id);
    return id;
  }
);

const entrancesSlice = createSlice({
  name: 'entrances',
  initialState,
  reducers: {
    setEntrances: (state, action: PayloadAction<Entrance[]>) => {
      state.entrances = action.payload;
    },
    selectEntrance: (state, action: PayloadAction<Entrance | null>) => {
      state.selectedEntrance = action.payload;
    },
    removeSelectedEntrance: (state) => {
      state.selectedEntrance = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEntrances.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchEntrances.fulfilled, (state, action) => {
        state.entrances = action.payload.entrances;
        state.totalCount = action.payload.totalCount;
        state.loading = false;
      })
      .addCase(fetchEntrances.rejected, (state) => {
        state.loading = false;
      })
      .addCase(createEntranceAsync.fulfilled, (state, action) => {
        state.entrances.unshift(action.payload);
      })
      .addCase(deleteEntranceAsync.fulfilled, (state, action) => {
        state.entrances = state.entrances.filter(e => e.id !== action.payload);
      })
      .addCase(fetchEntranceById.fulfilled, (state, action) => {
        state.selectedEntrance = action.payload;
      });
  },
});

export const {
  setEntrances,
  selectEntrance,
  removeSelectedEntrance,
} = entrancesSlice.actions;

export default entrancesSlice.reducer;
