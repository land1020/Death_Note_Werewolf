import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Card } from 'shared/types';

export type ModalType =
    | 'settings'
    | 'roleInfo'
    | 'cardInfo'
    | 'playerAction'
    | 'confirmation'
    | null;

export interface UIState {
    isLoading: boolean;
    error: string | null;
    modal: ModalType;
    selectedCard: Card | null;
    selectedPlayer: string | null;
    cutscenePlaying: boolean;
    cutsceneType: 'SHINIGAMI' | 'GUN' | 'ARREST' | 'JUDGMENT' | null;
    stolenCardNotification: { cardName: string } | null;
    watariReveal: { lPlayerName: string; lPlayerColor?: string } | null;
    draftKiraMisaMessage: string;
}

const initialState: UIState = {
    isLoading: false,
    error: null,
    modal: null,
    selectedCard: null,
    selectedPlayer: null,
    cutscenePlaying: false,
    cutsceneType: null,
    stolenCardNotification: null,
    watariReveal: null,
    draftKiraMisaMessage: '',
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        setModal: (state, action: PayloadAction<ModalType>) => {
            state.modal = action.payload;
        },
        setSelectedCard: (state, action: PayloadAction<Card | null>) => {
            state.selectedCard = action.payload;
        },
        setSelectedPlayer: (state, action: PayloadAction<string | null>) => {
            state.selectedPlayer = action.payload;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
        clearError: (state) => {
            state.error = null;
        },
        playCutscene: (state, action: PayloadAction<{ type: 'SHINIGAMI' | 'GUN' | 'ARREST' | 'JUDGMENT' }>) => {
            state.cutscenePlaying = true;
            state.cutsceneType = action.payload.type;
        },
        endCutscene: (state) => {
            state.cutscenePlaying = false;
            state.cutsceneType = null;
        },
        setStolenCardNotification: (state, action: PayloadAction<{ cardName: string; } | null>) => {
            state.stolenCardNotification = action.payload;
        },
        clearSelection: (state) => {
            state.selectedCard = null;
            state.selectedPlayer = null;
        },
        setWatariReveal: (state, action: PayloadAction<{ lPlayerName: string; lPlayerColor?: string } | null>) => {
            state.watariReveal = action.payload;
        },
        clearWatariReveal: (state) => {
            state.watariReveal = null;
        },
        setDraftKiraMisaMessage: (state, action: PayloadAction<string>) => {
            state.draftKiraMisaMessage = action.payload;
        }
    }
});

export const {
    setModal,
    setSelectedCard,
    setSelectedPlayer,
    setLoading,
    setError,
    clearError,
    playCutscene,
    endCutscene,
    clearSelection,
    setStolenCardNotification,
    setWatariReveal,
    clearWatariReveal,
    setDraftKiraMisaMessage
} = uiSlice.actions;

export default uiSlice.reducer;

// Selectors
export const selectUIState = (state: { ui: UIState }) => state.ui;
export const selectModal = (state: { ui: UIState }) => state.ui.modal;
export const selectSelectedCard = (state: { ui: UIState }) => state.ui.selectedCard;
export const selectSelectedPlayer = (state: { ui: UIState }) => state.ui.selectedPlayer;
export const selectIsLoading = (state: { ui: UIState }) => state.ui.isLoading;
export const selectError = (state: { ui: UIState }) => state.ui.error;
export const selectCutscenePlaying = (state: { ui: UIState }) => state.ui.cutscenePlaying;
export const selectCutsceneType = (state: { ui: UIState }) => state.ui.cutsceneType;
export const selectStolenCardNotification = (state: { ui: UIState }) => state.ui.stolenCardNotification;
export const selectWatariReveal = (state: { ui: UIState }) => state.ui.watariReveal;
export const selectDraftKiraMisaMessage = (state: { ui: UIState }) => state.ui.draftKiraMisaMessage;
