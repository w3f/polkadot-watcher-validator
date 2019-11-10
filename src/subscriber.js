const { ApiPromise, WsProvider } = require('@polkadot/api')

const { asyncForEach } = require('./async')

class Subscriber {
  constructor(cfg) {
    this.provider = new WsProvider(cfg.endpoint)
    this.subscribe = cfg.subscribe
    this.prometheus = cfg.prometheus
    this.unsubscribe = {}

    this.isInitialized = {}
    this.isInitialized['transactions'] = {}
    this.subscribe.transactions.forEach((account) => {
      this.isInitialized['transactions'][account.name] = false
    })
  }

  async start() {
    await this._initAPI()

    await this._subscribeTransactions(this.subscribe.transactions)
  }

  async _initAPI() {
    this.api = await ApiPromise.create({ provider: this.provider })

    const [chain, nodeName, nodeVersion] = await Promise.all([
      this.api.rpc.system.chain(),
      this.api.rpc.system.name(),
      this.api.rpc.system.version()
    ])
    console.log(
      `You are connected to chain ${chain} using ${nodeName} v${nodeVersion}`
    )
  }

  async _subscribeTransactions(accounts) {
    this.unsubscribe.transactions = []
    await asyncForEach(accounts, async (account) => {
      const unsub = await this.api.query.system.accountNonce(account.address, (nonce) => {
        console.log(`The nonce for ${account.name} is ${nonce}`)
        if (this.isInitialized['transactions'][account.name]) {
          console.log(`New transaction from ${account.name}`)
          this.prometheus.increaseTotalTransactions(account.name, account.address)
        } else {
          this.isInitialized['transactions'][account.name] = true
        }
      })
      this.unsubscribe.transactions.push(unsub)
    })
  }
}

module.exports = {
  Subscriber
}
