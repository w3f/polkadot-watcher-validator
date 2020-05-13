import BN from 'bn.js';
import tmp from 'tmp';
import fs from 'fs-extra';
import { Client, Keyring, Keystore, Balance } from '@w3f/polkadot-api-client';
import { TestPolkadotRPC } from '@w3f/test-utils';
import { should } from 'chai';

import { Subscriber } from '../src/subscriber';
import {
    LoggerMock,
    NotifierMock,
    PrometheusMock
} from './mocks';

should();

let keyring: Keyring;

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

const logger = new LoggerMock();
const pc = new PrometheusMock();
const nt = new NotifierMock();

const testRPC = new TestPolkadotRPC();

let subject: Subscriber;

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Subscriber', () => {
    before(async () => {
        await testRPC.start('0.7.33');

        keyring = new Keyring({ type: 'sr25519' });

        cfg.endpoint = testRPC.endpoint();
        subject = new Subscriber(cfg, pc, nt, logger);
    });

    after(async () => {
        await testRPC.stop();
    });

    describe('constructor', () => {
        it('creates an initialization object for all the cfg subscriber fields', () => {
            subject.isInitialized['Bob'].should.eq(false);
        });
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

        describe('transactions', async () => {
            it('should record sent transactions', async () => {
                const alice = keyring.addFromUri('//Alice');
                const bob = keyring.addFromUri('//Bob');

                const pass = 'pass';
                const aliceKeypairJson = keyring.toJson(alice.address, pass);
                const ksFile = tmp.fileSync();
                fs.writeSync(ksFile.fd, JSON.stringify(aliceKeypairJson));
                const passFile = tmp.fileSync();
                fs.writeSync(passFile.fd, pass);

                const ks: Keystore = { filePath: ksFile.name, passwordPath: passFile.name };
                const toSend = new BN(10000000000000);

                const endpoint = testRPC.endpoint();
                const client = new Client(endpoint, logger);

                await client.send(ks, bob.address, toSend as Balance);

                await delay(6000);

                let found = false;
                const expected = 'Alice';

                for (const data of nt.receivedData) {
                    const actual = data.name;
                    if (actual === expected) {
                        found = true;
                        break;
                    }
                }
                found.should.be.true;
            });
        });
    });
});
