const got = require('got')


class Matrixbot {
  constructor(cfg) {
    this.endpoint = cfg.endpoint
  }

  newTransaction(data) {
    const json = _transactionMsg(data)

    return _send(json)
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
            "description": `New transaction sent from account ${data.sender}, check https://polkascan.io/pre/${data.networkId}/account/${data.account}#transactions for details`
          }
        }
      ],
      "version": "4"
    }
  }

  _send(json) {
    return got.post(this.endpoint, {
      json
    })
  }
}

module.exports = {
  Matrixbot
}
