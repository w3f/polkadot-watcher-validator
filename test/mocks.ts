/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { PromClient } from "../src/types";


export class PrometheusMock implements PromClient {    
    private _blocksProducedReports = 0; 
    private _offlineReports = 0; 
    private _stateOfflineRisk = 0;
    private _stateOutOfActiveSet = 0;
    private _payeeChangedReports = 0; 
    private _commissionChangedReports = 0;
    private _statePayeeUnexpected = 0;
    private _stateCommissionUnexpected = 0;

    increaseBlocksProducedReports(name: string, address: string): void {
        this._blocksProducedReports++;
    }
    
    increaseOfflineReports(name: string, address: string): void {
      this._offlineReports++;
     }

    setStatusOfflineRisk(name: string): void {
      this._stateOfflineRisk = 1
    }
    resetStatusOfflineRisk(name: string): void {
      this._stateOfflineRisk = 0
    }
    isOfflineRiskStatusFiring(name: string): boolean {return false}

    setStatusOutOfActiveSet(name: string): void {
      this._stateOutOfActiveSet = 1
    }
    resetStatusOutOfActiveSet(name: string): void {
      this._stateOutOfActiveSet = 0
    }
    increasePayeeChangedReports(name: string, address: string): void {
      this._payeeChangedReports++;
    }
    increaseCommissionChangedReports(name: string, address: string): void {
      this._commissionChangedReports++;
    }

    setStatusValidatorPayeeUnexpected(name: string): void {
      this._statePayeeUnexpected = 1
    }
    resetStatusValidatorPayeeUnexpected(name: string): void {
      this._statePayeeUnexpected = 0
    }
    setStatusValidatorCommissionUnexpected(name: string): void {
      this._stateCommissionUnexpected = 1
    }
    resetStatusValidatorCommissionUnexpected(name: string): void {
      this._stateCommissionUnexpected = 0
    }


    get blocksProducedReports(): number {
        return this._blocksProducedReports;
    }
    get offlineReports(): number {
      return this._offlineReports;
    }
    get statusOfflineRisk(): number {
      return this._stateOfflineRisk;
    }
    get statusOutOfActiveSet(): number {
      return this._stateOutOfActiveSet;
    }
    get payeeChangedReports(): number {
      return this._payeeChangedReports;
    }
    get commissionChangedReports(): number {
      return this._commissionChangedReports;
    }
    get statusPayeeUnexpected(): number {
      return this._statePayeeUnexpected;
    }
    get statusCommissionUnexpected(): number {
      return this._stateCommissionUnexpected;
    }
}
