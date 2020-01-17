const { Subscriber } = require('../src/subscriber')

require('chai').should()

describe('Subscriber', () => {
  describe('constructor', () => {
    it('creates an initialization object for all the cfg subscriber fields', () => {
      const cfg = {
        subscribe: {
          field1: [{
            name: "name1"
          }],
          field2: [{
            name: "name2"
          }]
        }
      }

      const subject = new Subscriber(cfg)

      subject.isInitialized['field1']['name1'].should.eq(false)
    })
  })
})
