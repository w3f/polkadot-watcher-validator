const got = require('got')


class Matrixbot {
  constructor(cfg) {
    this.endpoint = cfg.endpoint
  }

  newTransaction(data) {
    const json = this._transactionMsg(data)

    return this._send(json)
  }

  _transactionMsg(data) {
    return {
      "receiver": "webhook",
      "status": "firing",
      "alerts": [
        {
          "status": "firing",
          "labels": {
            "alertname": "TransactionSent",
            "severity": "info"
          },
          "annotations": {
            "description": `New transaction sent from account ${data.name}, check https://polkascan.io/pre/${data.networkId}/account/${data.address}#transactions for details`
          }
        }
      ],
      "version": "4"
    }
  }

  _send(json) {
    return got.post(this.endpoint, { json })
  }
}

module.exports = {
  Matrixbot
}
