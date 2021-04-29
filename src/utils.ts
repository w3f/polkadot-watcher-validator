import { Event } from '@polkadot/types/interfaces/system';

export const isNewSessionEvent = (event: Event): boolean => {
  return event.section == 'session' && event.method == 'NewSession';
}

export const isOfflineEvent = (event: Event): boolean => {
  return event.section == 'imOnline' && event.method == 'SomeOffline';
}