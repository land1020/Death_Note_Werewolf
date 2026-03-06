import { CardId, Role } from 'shared/types';

export const getCardImagePath = (cardId: CardId | number): string => {
    return `/assets/images/cards/${cardId}.png`;
};

export const getRoleImagePath = (role: Role | string): string => {
    return `/assets/images/roles/${role}.png`;
};
