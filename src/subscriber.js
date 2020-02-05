const { ApiPromise, WsProvider } = require('@polkadot/api')

const { asyncForEach } = require('./async')

class Subscriber {
  constructor(cfg) {
    this.endpoint = cfg.endpoint
    this.networkId = cfg.networkId
    this.subscribe = cfg.subscribe
    this.validators = cfg.validators
    this.prometheus = cfg.prometheus
    this.notifier = cfg.notifier
    this.logger = cfg.logger

    this.unsubscribe = {}

    this.isInitialized = {}

    Object.keys(this.subscribe).forEach((subscription) => {
      this.isInitialized[subscription] = {}
      this.validators.forEach((account) => {
        this.isInitialized[subscription][account.name] = false
      })
    })
  }

  async start() {
    await this._initAPI()

    if (this.subscribe.transactions) {
      await this._subscribeTransactions()
    }
    if (this.subscribe.producers) {
      await this._subscribeProducers()
    }
    if (this.subscribe.offline) {
      await this._subscribeOffline()
    }
  }

  async _initAPI() {
    const provider = new WsProvider(this.endpoint)
    this.api = await ApiPromise.create({ provider })

    const [chain, nodeName, nodeVersion] = await Promise.all([
      this.api.rpc.system.chain(),
      this.api.rpc.system.name(),
      this.api.rpc.system.version()
    ])
    this.logger.info(
      `You are connected to chain ${chain} using ${nodeName} v${nodeVersion}`
    )
  }

  async _subscribeTransactions() {
    this.unsubscribe.transactions = []
    await asyncForEach(this.subscribe.transactions, async (account) => {
      const unsub = await this.api.query.system.accountNonce(account.address, async (nonce) => {
        this.logger.info(`The nonce for ${account.name} is ${nonce}`)
        if (this.isInitialized['transactions'][account.name]) {
          this.logger.info(`New transaction from ${account.name}`)
          // send data to notifier
          const data = {
            name: account.name,
            address: account.address,
            networkId: this.networkId
          }
          try {
            await this.notifier.newTransaction(data)
          } catch (e) {
            this.logger.info(`ERROR: could not notify transaction: ${e.message}`)
          }
        } else {
          this.isInitialized['transactions'][account.name] = true
        }
      })
      this.unsubscribe.transactions.push(unsub)
    })
  }

  async _subscribeProducers() {
    this.unsubscribe.producers = []

    this.validators.forEach((account) => {
      // always increase metric even the first time, so that we initialize the time serie
      // https://github.com/prometheus/prometheus/issues/1673
      this.prometheus.increaseTotalBlocksProduced(account.name, account.address)
    })

    const unsub = this.api.rpc.chain.subscribeNewHeads(async (header) => {
      // get block author
      const hash = await this.api.rpc.chain.getBlockHash(header.number)
      const deriveHeader = await this.api.derive.chain.getHeader(hash)
      const author = deriveHeader.author

      const account = this.validators.find((producer) => producer.address == author)
      if (account) {
        this.logger.info(`New block produced by ${account.name}`)
        this.prometheus.increaseTotalBlocksProduced(account.name, account.address)
      }
    })
    this.unsubscribe.producers.push(unsub)
  }

  async _subscribeOffline() {
    this.validators.forEach((account) => {
      // always increase metric even the first time, so that we initialize the time serie
      // https://github.com/prometheus/prometheus/issues/1673
      this.prometheus.increaseTotalValidatorOfflineReports(account.name)
    })

    this.api.query.system.events((events) => {
      events.forEach((record) => {
        const { event } = record;

        if(this._isOfflineEvent(event)) {
          const items = event.data[0]

          items.forEach((item) => {
            const offlineValidator = item[0]
            const account = this.validators.find((subject) => subject.address == offlineValidator)

            if (account) {
              this.logger.info(`${account.name} found offline`)
              this.prometheus.increaseTotalValidatorOfflineReports(account.name, account.address)
            }
          })
        }
      })
    })
  }

  _isOfflineEvent(event) {
    return event.section == 'imOnline' && event.method == 'SomeOffline'
  }
}

module.exports = {
  Subscriber
}
