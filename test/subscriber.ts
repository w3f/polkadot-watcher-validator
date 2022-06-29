import '@polkadot/api-augment'; //https://github.com/polkadot-js/api/issues/4450
import { TestPolkadotRPC } from '@w3f/test-utils';
import { LoggerSingleton } from '../src/logger'
import { should } from 'chai';

import { Subscriber } from '../src/subscriber';
import { Client } from '../src/client';
import {
    PrometheusMock
} from './mocks';

import { cryptoWaitReady} from '@polkadot/util-crypto'
import { Keyring } from '@polkadot/api';
import { KeyringPair } from '@polkadot/keyring/types';

should();

let alice: KeyringPair
let keyring: Keyring

const cfg = {
    logLevel: 'info',
    port: 3000,
    endpoint: 'some_endpoint',
    validators: [{
        name: 'Alice',
        address: 'GsvVmjr1CBHwQHw84pPHMDxgNY3iBLz6Qn7qS3CH8qPhrHz'
    }]
};

const cfg2 = {
  logLevel: 'info',
  port: 3000,
  endpoint: 'some_endpoint',
  validators: [{
      name: 'NotActiveAccount',
      address: 'FoQJpPyadYccjavVdTWxpxU7rUEaYhfLCPwXgkfD6Zat9QP'
  }]
};

const cfg3 = {
    logLevel: 'info',
    port: 3000,
    endpoint: 'some_endpoint',
    validators: [{
        name: 'Alice',
        address: 'GsvVmjr1CBHwQHw84pPHMDxgNY3iBLz6Qn7qS3CH8qPhrHz',
        expected: {
            commission: 17,
            payee: 'FoQJpPyadYccjavVdTWxpxU7rUEaYhfLCPwXgkfD6Zat9QP'
        }    
    }]
};

LoggerSingleton.setInstance("info")

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('with a started WASM interface', async () => {
    await cryptoWaitReady()
    keyring = new Keyring({ type: 'sr25519' });
    alice = keyring.addFromUri('//Alice', { name: 'Alice default' });
})

describe('Subscriber cfg1, with a started network', async () => {
    const testRPC = new TestPolkadotRPC();
    const prometheus = new PrometheusMock();
    let subject: Subscriber;
    before(async () => {
        await testRPC.start();
        cfg.endpoint = testRPC.endpoint()
        const api = await new Client(cfg).connect()
        subject = new Subscriber(cfg, api, prometheus);
    });

    after(async () => {
        await testRPC.stop();
    });

    describe('with an started instance', () => {
        before(async () => {
            await subject.start();
        });

        describe('validator status', async () => {
            it('should record produced blocks...', async () => {
                await delay(6000);

                prometheus.blocksProducedReports.should.be.gt(1); //counters are init to 1 
                prometheus.offlineReports.should.be.eq(1) //counters are init to 1 
                prometheus.statusOfflineRisk.should.be.eq(0)
                prometheus.statusOutOfActiveSet.should.be.eq(0)
                prometheus.payeeChangedReports.should.be.eq(1) //counters are init to 1 
                prometheus.commissionChangedReports.should.be.eq(1) //counters are init to 1 
                prometheus.statusCommissionUnexpected.should.be.eq(0)
                prometheus.statusPayeeUnexpected.should.be.eq(0)
            });

            it('should detect a payee change attempt...', async () => {
                await delay(6000);

                const current = prometheus.payeeChangedReports

                const call = testRPC.api().tx.staking.setPayee({Staked:{}}) //About Staked: not so relevant what the value is, it will be detected anyway 
                await call.signAndSend(alice)

                await delay(6000);

                prometheus.payeeChangedReports.should.be.eq(current+1)
            });

            it('should detect a payee change attempt 2...', async () => {
                await delay(6000);

                const current = prometheus.payeeChangedReports

                const call = testRPC.api().tx.staking.bond(cfg.validators[0].address,1,{Stash:{}}) //About Stash: not so relevant what the value is, it will be detected anyway 
                await call.signAndSend(alice)

                await delay(6000);

                prometheus.payeeChangedReports.should.be.eq(current+1)
            });
            it('should detect a commission rate change attempt...', async () => {
                await delay(6000);

                const current = prometheus.commissionChangedReports

                const call = testRPC.api().tx.staking.validate({commission: 100000000}) //10 percent in ppb
                await call.signAndSend(alice)

                await delay(6000);

                prometheus.commissionChangedReports.should.be.eq(current+1)
            });
        });

    });
});

describe('Subscriber cfg2, with a started network', () => {
  const testRPC = new TestPolkadotRPC();
  const prometheus = new PrometheusMock();
  let subject: Subscriber;
  before(async () => {
      await testRPC.start();
      cfg2.endpoint = testRPC.endpoint()
      const api = await new Client(cfg2).connect()
      subject = new Subscriber(cfg2, api, prometheus);
  });

  after(async () => {
      await testRPC.stop();
  });

  describe('with an started instance', () => {
      before(async () => {
          await subject.start();
      });

      describe('validator status', async () => {
          it('should NOT record blocks produced...', async () => {
              await delay(6000);

              prometheus.blocksProducedReports.should.be.eq(1); //counters are init to 1 
              prometheus.offlineReports.should.be.eq(1) //counters are init to 1 
              prometheus.statusOfflineRisk.should.be.eq(0)
              prometheus.statusOutOfActiveSet.should.be.eq(1)
              prometheus.payeeChangedReports.should.be.eq(1) //counters are init to 1 
              prometheus.commissionChangedReports.should.be.eq(1) //counters are init to 1 
          });
          it('should NOT detect a payee change attempt, Alice is not under monitoring...', async () => {
            await delay(6000);

            const call = testRPC.api().tx.staking.bond(alice.address,1,{Stash:{}}) //About Stash: not so relevant what the value is 
            await call.signAndSend(alice)

            await delay(6000);

            prometheus.payeeChangedReports.should.be.eq(1) //counters are init to 1 
          });
          it('should NOT detect a commission rate change attempt, Alice is not under monitoring...', async () => {
            await delay(6000);

            const call = testRPC.api().tx.staking.validate({commission: 10})
            await call.signAndSend(alice)

            await delay(6000);

            prometheus.commissionChangedReports.should.be.eq(1) //counters are init to 1 
          });
      });
  });
});

describe('Subscriber cfg3, with a started network', async () => {
    const testRPC = new TestPolkadotRPC();
    const prometheus = new PrometheusMock();
    let subject: Subscriber;
    before(async () => {
        await testRPC.start();
        cfg3.endpoint = testRPC.endpoint()
        const api = await new Client(cfg3).connect()
        subject = new Subscriber(cfg3, api, prometheus);
    });

    after(async () => {
        await testRPC.stop();
    });

    describe('with an started instance', () => {
        before(async () => {
            await subject.start();
        });

        describe('validator status', async () => {
            it('should detected an unexpected behaviour...', async () => {
                await delay(6000);

                prometheus.statusCommissionUnexpected.should.be.eq(1)
                prometheus.statusPayeeUnexpected.should.be.eq(1)
            });

            it('should detect an expected payee resolution...', async () => {
                await delay(6000);

                const current = prometheus.payeeChangedReports

                const call = testRPC.api().tx.staking.setPayee({Account: cfg3.validators[0].expected.payee})
                await call.signAndSend(alice)

                await delay(6000);

                prometheus.statusPayeeUnexpected.should.be.eq(0)
                prometheus.payeeChangedReports.should.be.eq(current+1)
            });

            it('should detect an expected commission resolution...', async () => {
                await delay(6000);

                const current = prometheus.commissionChangedReports

                const call = testRPC.api().tx.staking.validate({commission: cfg3.validators[0].expected.commission*10000000}) //percentage to ppb conversion
                await call.signAndSend(alice)

                await delay(6000);

                
                prometheus.statusCommissionUnexpected.should.be.eq(0)
                prometheus.commissionChangedReports.should.be.eq(current+1)
            });
        });

    });
});
