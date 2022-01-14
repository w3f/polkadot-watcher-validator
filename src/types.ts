import { SessionIndex, ValidatorId } from '@polkadot/types/interfaces';
import { Vec } from '@polkadot/types/codec';

export interface MatrixbotConfig {
    endpoint: string;
}

export interface Subscribable {
    name: string;
    address: string;
    controllerAddress?: string;
}

export interface SubscriberConfig {
    producers: boolean;
    offline: boolean;
}

export interface InputConfig {
    logLevel: string;
    port: number;
    endpoint: string;
    validators: Array<Subscribable>;
}

export interface PromClient {
    increaseTotalBlocksProduced(name: string, address: string): void;
    initTotalBlocksProduced(name: string, address: string): void;
    increaseTotalValidatorOfflineReports(name: string, address: string): void;
    resetTotalValidatorOfflineReports(name: string, address: string): void;
    setStatusValidatorOffline(name: string): void;
    resetStatusValidatorOffline(name: string): void;
    isValidatorStatusOffline(name: string): boolean;
    setStatusValidatorOutOfActiveSet(name: string): void;
    resetStatusValidatorOutOfActiveSet(name: string): void;
    setStatusValidatorPayeeChanged(name: string, address: string): void;
    resetStatusValidatorPayeeChanged(name: string, address: string): void;
}

interface LabelMap {
    alertname: string;
    severity: string;
}

interface Annotation {
    description: string;
}

interface Alert {
    status: string;
    labels: LabelMap;
    annotations: Annotation;
}

export interface MatrixbotMsg {
    receiver: string;
    status: string;
    alerts: Array<Alert>;
    version: string;
}

export interface ValidatorImOnlineParameters {
  isHeartbeatExpected: boolean;
  sessionIndex: SessionIndex;
  eraIndex: number;
  validatorActiveSet: Vec<ValidatorId>;
}
