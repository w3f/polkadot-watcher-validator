import { TestPolkadotRPC } from '@w3f/test-utils';
import { createLogger } from '@w3f/logger';
import { should } from 'chai';

import { Subscriber } from '../src/subscriber';
import { Client } from '../src/client';
import {
    PrometheusMock
} from './mocks';
import '@polkadot/api-augment';

should();

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

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Subscriber cfg1, with a started network', () => {
    const testRPC = new TestPolkadotRPC();
    const prometheus = new PrometheusMock();
    const logger = createLogger();
    let subject: Subscriber;
    before(async () => {
        await testRPC.start();
        cfg.endpoint = testRPC.endpoint()
        const api = await new Client(cfg,logger).connect()
        subject = new Subscriber(cfg, api, prometheus, logger);
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

                prometheus.totalBlocksProduced.should.be.gt(0);
                prometheus.totalValidatorOfflineReports.should.be.eq(0)
                prometheus.statusValidatorOffline.should.be.eq(0)
                prometheus.statusValidatorOutOfActiveSet.should.be.eq(0)
                prometheus.statusValidatorPayeeChanged.should.be.eq(0)
            });
        });
    });
});

describe('Subscriber cfg2, with a started network', () => {
  const testRPC = new TestPolkadotRPC();
  const prometheus = new PrometheusMock();
  const logger = createLogger();
  let subject: Subscriber;
  before(async () => {
      await testRPC.start();
      cfg2.endpoint = testRPC.endpoint()
      const api = await new Client(cfg2,logger).connect()
      subject = new Subscriber(cfg2, api, prometheus, logger);
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

              prometheus.totalBlocksProduced.should.be.eq(0);
              prometheus.totalValidatorOfflineReports.should.be.eq(0)
              prometheus.statusValidatorOffline.should.be.eq(0)
              prometheus.statusValidatorOutOfActiveSet.should.be.eq(1)
              prometheus.statusValidatorPayeeChanged.should.be.eq(0)
          });
      });
  });
});
