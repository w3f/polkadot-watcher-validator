/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { TransactionData } from '../src/types';


export class PrometheusMock {
    private _totalBlocksProduced = 0;

    increaseTotalBlocksProduced(name: string, address: string): void {
        this._totalBlocksProduced++;
    }
    increaseTotalValidatorOfflineReports(name: string, address: string): void { }
    resetTotalValidatorOfflineReports(name: string): void { }

    setStatusValidatorOffline(name: string): void {}
    resetStatusValidatorOffline(name: string): void {}
    isValidatorStatusOffline(name: string): boolean {return true}

    setStatusValidatorOutOfActiveSet(name: string): void {}
    resetStatusValidatorOutOfActiveSet(name: string): void {}

    get totalBlocksProduced(): number {
        return this._totalBlocksProduced;
    }
}

export class NotifierMock {
    private _receivedData: Array<TransactionData> = [];

    async newTransaction(data: TransactionData): Promise<string> {
        this._receivedData.push(data);
        return "";
    }

    get receivedData(): Array<TransactionData> {
        return this._receivedData;
    }

    resetReceivedData(): void {
        this._receivedData = [];
    }
}
