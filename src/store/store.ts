import { configureStore } from '@reduxjs/toolkit';
import transazioneReducer from '../features/slice/transazioniSlice';
import clientiReducer from '../features/slice/clientiSlice';
import settingsReducer from '../features/slice/settingsSlice';
import genericReducer from '../features/slice/genericSlice';


export const store = configureStore({
  reducer: {
    transazioni: transazioneReducer,
    clienti: clientiReducer,
    settings: settingsReducer,
    generic: genericReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
