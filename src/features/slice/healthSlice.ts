import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as healthService from "../api/HealthService";

const RETRY_COUNT = 3;
const RETRY_DELAY_MS = 1000; // 1 secondo

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const checkHealth = createAsyncThunk(
  "health/check",
  async (_, thunkAPI) => {
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= RETRY_COUNT; attempt++) {
      try {
        const data = await healthService.checkHealth();
        return data;
      } catch (error) {
        lastError = error;
        // Se non è l’ultimo tentativo, aspetta e riprova
        if (attempt < RETRY_COUNT) {
          await delay(RETRY_DELAY_MS);
        }
      }
    }

    // Se siamo qui, tutti i tentativi sono falliti
    const message =
      lastError instanceof Error ? lastError.message : "Errore sconosciuto";
    return thunkAPI.rejectWithValue(message);
  }
);

interface HealthState {
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  isHealthy: boolean;
}

const initialState: HealthState = {
  status: "idle",
  error: null,
  isHealthy: false,
};

const healthSlice = createSlice({
  name: "health",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(checkHealth.pending, (state) => {
        state.status = "loading";
        state.error = null;
        state.isHealthy = false;
      })
      .addCase(checkHealth.fulfilled, (state) => {
        state.status = "succeeded";
        state.isHealthy = true;
      })
      .addCase(checkHealth.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
        state.isHealthy = false;
      });
  },
});

export default healthSlice.reducer;
