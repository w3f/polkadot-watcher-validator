/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */


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
