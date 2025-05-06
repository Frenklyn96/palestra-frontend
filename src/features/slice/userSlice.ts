import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserState {
  userId: string | null;
  email: string | null;
}

const initialState: UserState = {
  userId: null,
  email: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUserInfo: (
      state,
      action: PayloadAction<{ userId: string; email: string }>
    ) => {
      state.userId = action.payload.userId;
      state.email = action.payload.email;
    },
    clearUserInfo: (state) => {
      state.userId = null;
      state.email = null;
    },
  },
});

export const { setUserInfo, clearUserInfo } = userSlice.actions;
export default userSlice.reducer;
