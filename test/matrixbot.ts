import nock from 'nock';
import { should } from 'chai';

import { Matrixbot, MsgTemplate } from '../src/matrixbot';
import { TransactionType } from '../src/types';

should();

const host = 'http://localhost:9090';
const path = 'matrixbot';
const endpoint = `${host}/${path}`;
const subject = new Matrixbot(endpoint);
const senderName = 'senderName';
const senderAddress = 'senderAddress';
const networkId = 'networkId';

const expectedSentMessage = { ...MsgTemplate };
expectedSentMessage.alerts[0].annotations.description = `New transaction sent from account ${senderName}, check https://polkascan.io/pre/${networkId}/account/${senderAddress}#transactions for details`;

describe('Matrixbot', () => {
    describe('newTransaction', () => {
        afterEach(() => {
            nock.cleanAll();
        });

        it('notifies transactions sent', async () => {
            nock(host)
                .post(`/${path}`, expectedSentMessage)
                .reply(200);

            const data = {
                name: senderName,
                txType: TransactionType.Sent,
                address: senderAddress,
                networkId: networkId
            };

            await subject.newTransaction(data);
        });
        it('notifies transactions received');
    });
});
