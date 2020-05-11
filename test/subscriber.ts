import { Subscriber } from '../src/subscriber';
import { should } from 'chai';

import {
    LoggerMock,
    NotifierMock,
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
        'name': 'validator1',
        'address': 'some_address'
    }],
    subscribe: {
        validatorSubscription: true,
        transactions: [{
            name: 'txName',
            address: 'some_address'
        }],
        producers: true,
        offline: true
    }
};

const logger = new LoggerMock();
const pc = new PrometheusMock();
const nt = new NotifierMock();

const subject = new Subscriber(cfg, pc, nt, logger);
describe('Subscriber', () => {
    describe('constructor', () => {
        it('creates an initialization object for all the cfg subscriber fields', () => {
            subject.isInitialized['validatorSubscription']['validator1'].should.eq(false);
            subject.isInitialized['transactions']['txName'].should.eq(false);
        })
    })
})
