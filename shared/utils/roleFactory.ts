import { Role, RoleConfig } from '../types';

export const DEFAULT_ROLE_CONFIG: RoleConfig = {
    4: {
        [Role.KIRA]: 1,
        [Role.MISA]: 0,
        [Role.L]: 1,
        [Role.POLICE]: 2,
        [Role.WATARI]: 0,
        [Role.MELLO]: 0,
    },
    5: {
        [Role.KIRA]: 1,
        [Role.MISA]: 1,
        [Role.L]: 1,
        [Role.POLICE]: 2,
        [Role.WATARI]: 0,
        [Role.MELLO]: 0,
    },
    6: {
        [Role.KIRA]: 1,
        [Role.MISA]: 1,
        [Role.L]: 2,
        [Role.POLICE]: 2,
        [Role.WATARI]: 0,
        [Role.MELLO]: 0,
    },
    7: {
        [Role.KIRA]: 1,
        [Role.MISA]: 1,
        [Role.L]: 2,
        [Role.POLICE]: 1,
        [Role.WATARI]: 1,
        [Role.MELLO]: 1,
    },
    8: {
        [Role.KIRA]: 1,
        [Role.MISA]: 1,
        [Role.L]: 2,
        [Role.POLICE]: 2,
        [Role.WATARI]: 1,
        [Role.MELLO]: 1,
    },
};
