import got from 'got';

import { TransactionData, Notifier } from './types';

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

interface MatrixbotMsg {
    receiver: string;
    status: string;
    alerts: Array<Alert>;
    version: string;
}

export class Matrixbot implements Notifier {
    constructor(private readonly endpoint: string) { }

    async newTransaction(data: TransactionData): Promise<string> {
        const json = this.transactionMsg(data);

        return this.send(json);
    }

    private transactionMsg(data: TransactionData): MatrixbotMsg {
        return {
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
                        "description": `New transaction sent from account ${data.name}, check https://polkascan.io/pre/${data.networkId}/account/${data.address}#transactions for details`
                    }
                }
            ],
            "version": "4"
        };
    }

    private async send(json: MatrixbotMsg): Promise<string> {
        const result = await got.post(this.endpoint, { json });
        return result.body;
    }
}
