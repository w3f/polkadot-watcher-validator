export interface MatrixbotConfig {
    endpoint: string;
}

export interface Subscribable {
    name: string;
    address: string;
}

export interface SubscriberConfig {
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
