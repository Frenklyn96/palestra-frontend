import { configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // usa localStorage
import { combineReducers } from 'redux';

import transazioneReducer from '../features/slice/transazioniSlice';
import clientiReducer from '../features/slice/clientiSlice';
import settingsReducer from '../features/slice/settingsSlice';
import genericReducer from '../features/slice/genericSlice';
import userReducer from '../features/slice/userSlice';


// Config per redux-persist
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['user'], // solo lo slice "user" verrà persistito
};

// Combinazione dei reducer
const rootReducer = combineReducers({
  transazioni: transazioneReducer,
  clienti: clientiReducer,
  settings: settingsReducer,
  generic: genericReducer,
  user: userReducer,
});

// Applica redux-persist
const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // serve per evitare warning con redux-persist
    }),
});

export const persistor = persistStore(store);

// Tipi
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
