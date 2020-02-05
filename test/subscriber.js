const { Subscriber } = require('../src/subscriber')

require('chai').should()

describe('Subscriber', () => {
  describe('constructor', () => {
    it('creates an initialization object for all the cfg subscriber fields', () => {
      const cfg = {
        validators: [{"name": "validator1"}],
        subscribe: {
          validatorSubscription: true,
          transactions: [{
            name: "txName"
          }]
        }
      }

      const subject = new Subscriber(cfg)

      subject.isInitialized['validatorSubscription']['validator1'].should.eq(false)
      subject.isInitialized['transactions']['txName'].should.eq(false)
    })
  })
})
