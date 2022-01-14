/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { PromClient } from "../src/types";


export class PrometheusMock implements PromClient {
    
    private _totalBlocksProduced = 0;
    private _totalValidatorOfflineReports = 0;
    private _stateValidatorOffline = 0;
    private _stateValidatorOutOfActiveSet = 0;
    private _stateValidatorPayeeReports = 0;

    increaseTotalBlocksProduced(name: string, address: string): void {
        this._totalBlocksProduced++;
    }

    initTotalBlocksProduced(name: string, address: string): void {
      this._totalBlocksProduced = 0;
    }
    
    increaseTotalValidatorOfflineReports(name: string, address: string): void { }
    resetTotalValidatorOfflineReports(name: string, address: string): void { }

    setStatusValidatorOffline(name: string): void {
      this._stateValidatorOffline = 1
    }
    resetStatusValidatorOffline(name: string): void {
      this._stateValidatorOffline = 0
    }
    isValidatorStatusOffline(name: string): boolean {return false}

    setStatusValidatorOutOfActiveSet(name: string): void {
      this._stateValidatorOutOfActiveSet = 1
    }
    resetStatusValidatorOutOfActiveSet(name: string): void {
      this._stateValidatorOutOfActiveSet = 0
    }
    setStatusValidatorPayeeChanged(name: string): void {
      this._stateValidatorPayeeReports = 1;
    }
    resetStatusValidatorPayeeChanged(name: string): void {
      this._stateValidatorPayeeReports = 0;
    }


    get totalBlocksProduced(): number {
        return this._totalBlocksProduced;
    }
    get totalValidatorOfflineReports(): number {
      return this._totalValidatorOfflineReports;
    }
    get statusValidatorOffline(): number {
      return this._stateValidatorOffline;
    }
    get statusValidatorOutOfActiveSet(): number {
      return this._stateValidatorOutOfActiveSet;
    }
    get statusValidatorPayeeChanged(): number {
      return this._stateValidatorPayeeReports;
    }
}
