import { Balance } from '@polkadot/types/interfaces';
import BN from 'bn.js';

export const ZeroBN = new BN(0);
export const ZeroBalance = ZeroBN as Balance;
export const payeeMetricAutoresolveMillis = 1200000; //20 minutes
export const commissionMetricAutoresolveMillis = 1200000; //20 minutes
export const environment = "production"
