/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { TransactionData } from '../src/types';


export class LoggerMock {
    info(msg: string): void { }
    error(msg: string): void { }
    debug(msg: string): void { }
}

export class PrometheusMock {
    increaseTotalBlocksProduced(name: string, address: string): void { }
    increaseTotalValidatorOfflineReports(name: string, address: string): void { }
    resetTotalValidatorOfflineReports(name: string): void { }
}

export class NotifierMock {
    newTransaction(data: TransactionData): void { }
}
