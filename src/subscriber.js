const { ApiPromise, WsProvider } = require('@polkadot/api')

const { asyncForEach } = require('./async')

class Subscriber {
  constructor(cfg) {
    this.endpoint = cfg.endpoint
    this.subscribe = cfg.subscribe
    this.prometheus = cfg.prometheus
    this.logger = cfg.logger

    this.unsubscribe = {}

    this.isInitialized = {}

    Object.keys(this.subscribe).forEach((subscription) => {
      this.isInitialized[subscription] = {}
      this.subscribe[subscription].forEach((account) => {
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
      const unsub = await this.api.query.system.accountNonce(account.address, (nonce) => {
        this.logger.info(`The nonce for ${account.name} is ${nonce}`)
        if (this.isInitialized['transactions'][account.name]) {
          this.logger.info(`New transaction from ${account.name}`)
        } else {
          this.isInitialized['transactions'][account.name] = true
        }
        // always increase metric even the first time, so that we initialize the time serie
        // https://github.com/prometheus/prometheus/issues/1673
        this.prometheus.increaseTotalTransactions(account.name, account.address)
      })
      this.unsubscribe.transactions.push(unsub)
    })
  }

  async _subscribeProducers() {
    this.unsubscribe.producers = []

    this.subscribe.producers.forEach((account) => {
      // always increase metric even the first time, so that we initialize the time serie
      // https://github.com/prometheus/prometheus/issues/1673
      this.prometheus.increaseTotalBlocksProduced(account.name, account.address)
    })

    const unsub = this.api.rpc.chain.subscribeNewHeads(async (header) => {
      // get block author
      const hash = await this.api.rpc.chain.getBlockHash(header.number)
      const deriveHeader = await this.api.derive.chain.getHeader(hash)
      const author = deriveHeader.author

      const account = this.subscribe.producers.find((producer) => producer.address == author)
      if (account) {
        this.logger.info(`New block produced by ${account.name}`)
        this.prometheus.increaseTotalBlocksProduced(account.name, account.address)
      }
    })
    this.unsubscribe.producers.push(unsub)
  }
}

module.exports = {
  Subscriber
}
