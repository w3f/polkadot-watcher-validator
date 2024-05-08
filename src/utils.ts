/*eslint @typescript-eslint/no-use-before-define: ["error", { "variables": false }]*/

import { ApiPromise } from '@polkadot/api';
import { Event } from '@polkadot/types/interfaces/system';
import { SessionIndex, Header } from '@polkadot/types/interfaces';
import { Subscribable } from './types';
import { ZeroBN } from './constants';
import { LoggerSingleton } from './logger';

const logger = LoggerSingleton.getInstance()

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

export const isHeadAfterHeartbeatBlockThreshold = async (api: ApiPromise, header: Header): Promise<boolean> => {
  return false
  //I'm online pallet got removed: https://github.com/paritytech/polkadot-sdk/issues/4359
  const currentBlock = header.number.toBn()
  const blockThreshold = await api.query.imOnline.heartbeatAfter() //threshold after which an heartbeat is expected
  logger.debug(`Current Block: ${currentBlock}\tHeartbeatBlock Threshold: ${blockThreshold}`);
  return currentBlock.cmp(blockThreshold) > 0
}

export async function asyncForEach<T>(array: Array<T>, callback: (arg0: T, arg1: number, arg2: Array<T>) => void): Promise<void> {
  for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
  }
}

const _hasValidatorAuthoredBlocks = async (validator: Subscribable, sessionIndex: SessionIndex, api: ApiPromise): Promise<boolean> => {
  return true
  //I'm online pallet got removed: https://github.com/paritytech/polkadot-sdk/issues/4359
  const numBlocksAuthored = await api.query.imOnline.authoredBlocks(sessionIndex,validator.address)
  return numBlocksAuthored.cmp(ZeroBN) > 0
}

const _hasValidatorSentHeartbeats = async (validatorIndex: number, sessionIndex: SessionIndex, api: ApiPromise): Promise<boolean> => {
  return true
  //I'm online pallet got removed: https://github.com/paritytech/polkadot-sdk/issues/4359
  if (validatorIndex < 0) return false;
  const hb = await api.query.imOnline.receivedHeartbeats(sessionIndex,validatorIndex) 
  return hb.toHuman() ? true : false
}