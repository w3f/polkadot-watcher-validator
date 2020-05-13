/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { TransactionData } from '../src/types';


export class LoggerMock {
    info(msg: string): void {
        console.log(msg);
    }
    error(msg: string): void { }
    debug(msg: string): void { }
}

export class PrometheusMock {
    private _totalBlocksProduced = 0;

    increaseTotalBlocksProduced(name: string, address: string): void {
        this._totalBlocksProduced++;
    }
    increaseTotalValidatorOfflineReports(name: string, address: string): void { }
    resetTotalValidatorOfflineReports(name: string): void { }

    get totalBlocksProduced(): number {
        return this._totalBlocksProduced;
    }
}

export class NotifierMock {
    private _receiveData: Array<TransactionData> = [];

    newTransaction(data: TransactionData): void {
        this._receiveData.push(data);
    }

    get receivedData(): Array<TransactionData> {
        return this._receiveData;
    }

    resetReceivedData(): void {
        this._receiveData = [];
    }
}
