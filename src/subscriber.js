const { ApiPromise, WsProvider } = require('@polkadot/api')

class Subscriber {
  constructor(endpoint) {
    this.provider = new WsProvider(endpoint)
  }

  async start() {
    await this._initAPI()
  }

  async _initAPI() {
    const api = await ApiPromise.create({ provider: this.provider })

    const [chain, nodeName, nodeVersion] = await Promise.all([
      api.rpc.system.chain(),
      api.rpc.system.name(),
      api.rpc.system.version()
    ])
    console.log(
      `You are connected to chain ${chain} using ${nodeName} v${nodeVersion}`
    )
  }
}

module.exports = {
  Subscriber
}
