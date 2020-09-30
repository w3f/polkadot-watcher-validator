import { TestPolkadotRPC } from '@w3f/test-utils';
import { createLogger } from '@w3f/logger';
import { should } from 'chai';

import { Subscriber } from '../src/subscriber';
import {
    PrometheusMock
} from './mocks';

should();

const cfg = {
    logLevel: 'info',
    port: 3000,
    endpoint: 'some_endpoint',
    matrixbot: {
        endpoint: 'some_endpoint'
    },
    networkId: 'some_networkId',
    validators: [{
        name: 'Alice',
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
    }],
    subscribe: {
        validatorSubscription: true,
        transactions: [{
            name: 'Alice',
            address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
        },
        {
            name: 'Bob',
            address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'
        }],
        producers: true,
        offline: true
    }
};

const logger = createLogger();
const pc = new PrometheusMock();

const testRPC = new TestPolkadotRPC();

let subject: Subscriber;

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Subscriber', () => {
    before(async () => {
        await testRPC.start('0.7.33');

        cfg.endpoint = testRPC.endpoint();
        subject = new Subscriber(cfg, pc, logger);
    });

    after(async () => {
        await testRPC.stop();
    });

    describe('with an started instance', () => {
        before(async () => {
            await subject.start();
        });

        describe('blocks produced', async () => {
            it('should record produced blocks', async () => {
                await delay(6000);

                pc.totalBlocksProduced.should.be.gt(0);
            });
        });
    });
});
