import { SessionIndex, ValidatorId } from '@polkadot/types/interfaces';
import { Vec } from '@polkadot/types/codec';

export interface Subscribable {
    name: string;
    address: string;
    controllerAddress?: string;
    expected?: {
      commission?: number;
      payee?: string;  
    };
}

export interface InputConfig {
    logLevel: string;
    environment: string;
    port: number;
    endpoint: string;
    validators?: Array<Subscribable>;
    validatorsFromGit?: {
        enabled: boolean;
        platform: string;
        private: {
            enabled: boolean;
            apiToken: string;
        };
        network: string;
        url: string;
    };
}

export interface InputConfigFromGit {
    Kusama: Array<Subscribable>;
    Polkadot: Array<Subscribable>;
}

export interface PromClient {
    increaseBlocksProducedReports(name: string, address: string): void;
    increaseSlashedReports(name: string, address: string): void;
    setStatusOutOfActiveSet(name: string, address: string): void;
    resetStatusOutOfActiveSet(name: string, address: string): void;
    increasePayeeChangedReports(name: string, address: string): void;
    increaseCommissionChangedReports(name: string, address: string): void;
    setStatusValidatorPayeeUnexpected(name: string, address: string): void;
    resetStatusValidatorPayeeUnexpected(name: string, address: string): void;
    setStatusValidatorCommissionUnexpected(name: string, address: string): void;
    resetStatusValidatorCommissionUnexpected(name: string, address: string): void;
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
  sessionIndex: SessionIndex;
  eraIndex: number;
  validatorActiveSet: Vec<ValidatorId>;
}
