const { ApiPromise, WsProvider } = require('@polkadot/api')

const { asyncForEach } = require('./async')

class Subscriber {
  constructor(endpoint, subscribe) {
    this.provider = new WsProvider(endpoint)
    this.subscribe = subscribe
    this.unsubscribe = {}
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
      })
      this.unsubscribe.transactions.push(unsub)
    })
  }
}

module.exports = {
  Subscriber
}
