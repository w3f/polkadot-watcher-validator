import got from 'got';

import { TransactionData, Notifier, MatrixbotMsg } from './types';

export const MsgTemplate = {
    "receiver": "webhook",
    "status": "firing",
    "alerts": [
        {
            "status": "firing",
            "labels": {
                "alertname": "TransactionSent",
                "severity": "info"
            },
            "annotations": {
                "description": ""
            }
        }
    ],
    "version": "4"
};


export class Matrixbot implements Notifier {
    constructor(private readonly endpoint: string) { }

    async newTransaction(data: TransactionData): Promise<string> {
        const json = this.transactionMsg(data);

        return this.send(json);
    }

    private transactionMsg(data: TransactionData): MatrixbotMsg {
        const msg = { ...MsgTemplate };

        msg.alerts[0].annotations.description = `New transaction sent from account ${data.name}, check https://polkascan.io/pre/${data.networkId}/account/${data.address}#transactions for details`;

        return msg;
    }

    private async send(json: MatrixbotMsg): Promise<string> {
        const result = await got.post(this.endpoint, { json });
        return result.body;
    }
}
