import nock from 'nock';
import * as _ from 'lodash';
import { should } from 'chai';

import { Matrixbot } from '../src/matrixbot';
import { TransactionType } from '../src/types';

should();

const host = 'http://localhost:9090';
const path = 'matrixbot';
const endpoint = `${host}/${path}`;
const subject = new Matrixbot(endpoint);
const senderName = 'senderName';
const senderAddress = 'senderAddress';
const receiverName = 'receiverName';
const receiverAddress = 'receiverAddress';
const networkId = 'networkId';

const expectedSentMessage = `New transaction sent from account ${senderName}, check https://polkascan.io/pre/${networkId}/account/${senderAddress}#transactions for details`;

const expectedReceivedMessage = `New transaction received in account ${receiverName}, check https://polkascan.io/pre/${networkId}/account/${receiverAddress}#transactions for details`;

describe('Matrixbot', () => {
    describe('newTransaction', () => {
        afterEach(() => {
            nock.cleanAll();
        });

        it('notifies transactions sent', async () => {
            nock(host)
                .post(`/${path}`,
                    _.matches({ alerts: [{ annotations: { description: expectedSentMessage } }] }))
                .reply(200);

            const data = {
                name: senderName,
                txType: TransactionType.Sent,
                address: senderAddress,
                networkId: networkId
            };

            await subject.newTransaction(data);
        });

        it('notifies transactions received', async () => {
            nock(host)
                .post(`/${path}`,
                    _.matches({ alerts: [{ annotations: { description: expectedReceivedMessage } }] }))
                .reply(200);

            const data = {
                name: receiverName,
                txType: TransactionType.Received,
                address: receiverAddress,
                networkId: networkId
            };

            await subject.newTransaction(data);
        });
    });
});
