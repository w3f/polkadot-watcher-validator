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

describe('Subscriber cfg1', () => {
    const testRPC = new TestPolkadotRPC();
    const pc = new PrometheusMock();
    let subject: Subscriber;
    const logger = createLogger();
    before(async () => {
        await testRPC.start();

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

        describe('validator status', async () => {
            it('should record produced blocks...', async () => {
                await delay(6000);

                pc.totalBlocksProduced.should.be.gt(0);
                pc.totalValidatorOfflineReports.should.be.eq(0)
                pc.statusValidatorOffline.should.be.eq(0)
                pc.statusValidatorOutOfActiveSet.should.be.eq(0)
            });
        });
    });
});

describe('Subscriber cfg2', () => {
  const testRPC = new TestPolkadotRPC();
  const pc = new PrometheusMock();
  let subject: Subscriber;
  const logger = createLogger();
  before(async () => {
      await testRPC.start();

      cfg2.endpoint = testRPC.endpoint();
      subject = new Subscriber(cfg2, pc, logger);
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

              pc.totalBlocksProduced.should.be.eq(0);
              pc.totalValidatorOfflineReports.should.be.eq(0)
              pc.statusValidatorOffline.should.be.eq(0)
              pc.statusValidatorOutOfActiveSet.should.be.eq(1)
          });
      });
  });
});
