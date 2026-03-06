import { configureStore } from '@reduxjs/toolkit';
import roomReducer from './roomSlice';
import gameReducer from './gameSlice';
import uiReducer from './uiSlice';

export const store = configureStore({
    reducer: {
        room: roomReducer,
        game: gameReducer,
        ui: uiReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Re-export actions
export * from './roomSlice';
export * from './gameSlice';
export * from './uiSlice';
