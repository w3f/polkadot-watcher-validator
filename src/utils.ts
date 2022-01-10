/*eslint @typescript-eslint/no-use-before-define: ["error", { "variables": false }]*/

import { ApiPromise } from '@polkadot/api';
import { Event } from '@polkadot/types/interfaces/system';
import { SessionIndex, BlockNumber } from '@polkadot/types/interfaces';
import { Subscribable } from './types';
import { ZeroBN } from './constants';

export const isNewSessionEvent = (event: Event): boolean => {
  return event.section == 'session' && event.method == 'NewSession';
}

export const isOfflineEvent = (event: Event): boolean => {
  return event.section == 'imOnline' && event.method == 'SomeOffline';
}

export const hasValidatorProvedOnline = async (account: Subscribable, validatorIndex: number, sessionIndex: SessionIndex, api: ApiPromise): Promise<boolean> => {
  return await _hasValidatorAuthoredBlocks(account,sessionIndex,api) || await _hasValidatorSentHeartbeats(validatorIndex,sessionIndex,api)
}

export const getActiveEraIndex = async (api: ApiPromise): Promise<number> => {
  return (await api.query.staking.activeEra()).toJSON()['index']; 
}

export const getHeartbeatBlockThreshold = async (api: ApiPromise): Promise<BlockNumber> => {
  return api.query.imOnline.heartbeatAfter()
}

export async function asyncForEach<T>(array: Array<T>, callback: (arg0: T, arg1: number, arg2: Array<T>) => void): Promise<void> {
  for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
  }
}

export const firstBlockPreviousEra = async (api: ApiPromise): Promise<number> => {

  const last = await api.rpc.chain.getHeader()
  const deriveSessionProgress = await api.derive.session.progress();  
  // we want to find a random block in the previous era
  const blockInPreviousEra = last.number.unwrap().toNumber() - deriveSessionProgress.eraProgress.toNumber() - 100 

  const hash = await api.rpc.chain.getBlockHash(blockInPreviousEra)
  const [_,firstBlockPreviusEra] = await api.query.babe.epochStart.at(hash)
  
  return firstBlockPreviusEra.toNumber()
}

export const firstBlockCurrentEra = async (api: ApiPromise): Promise<number> => {

  const hash = await api.rpc.chain.getBlockHash() 
  const [_,firstBlockCurrentEra] = await api.query.babe.epochStart.at(hash)
  
  return firstBlockCurrentEra.toNumber()
}

const _hasValidatorAuthoredBlocks = async (validator: Subscribable, sessionIndex: SessionIndex, api: ApiPromise): Promise<boolean> => {
  const numBlocksAuthored = await api.query.imOnline.authoredBlocks(sessionIndex,validator.address)
  return numBlocksAuthored.cmp(ZeroBN) > 0
}

const _hasValidatorSentHeartbeats = async (validatorIndex: number, sessionIndex: SessionIndex, api: ApiPromise): Promise<boolean> => {
  if (validatorIndex < 0) return false;
  const hb = await api.query.imOnline.receivedHeartbeats(sessionIndex,validatorIndex) 
  return hb.toHuman() ? true : false
}