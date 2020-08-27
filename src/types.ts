export interface MatrixbotConfig {
    endpoint: string;
}

export interface Subscribable {
    name: string;
    address: string;
}

export interface SubscriberConfig {
    transactions: Array<Subscribable>;
    producers: boolean;
    offline: boolean;
}

export interface InputConfig {
    logLevel: string;
    port: number;
    matrixbot: MatrixbotConfig;
    endpoint: string;
    networkId: string;
    subscribe: SubscriberConfig;
    validators: Array<Subscribable>;
}

export interface PromClient {
    increaseTotalBlocksProduced(name: string, address: string): void;
    increaseTotalValidatorOfflineReports(name: string, address: string): void;
    resetTotalValidatorOfflineReports(name: string): void;
    setStatusValidatorOffline(name: string): void;
    resetStatusValidatorOffline(name: string): void;
    isValidatorStatusOffline(name: string): boolean;
    setStatusValidatorOutOfActiveSet(name: string): void;
    resetStatusValidatorOutOfActiveSet(name: string): void;
}

export enum TransactionType {
    Received,
    Sent
}

export interface TransactionData extends Subscribable {
    txType?: TransactionType;
    networkId: string;
}

export interface Notifier {
    newTransaction(data: TransactionData): Promise<string>;
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
