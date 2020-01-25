{
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
        "description": "New transaction sent from account {{ sender }}, check https://polkascan.io/pre/{{ networkId }}/account/{{ account }}#transactions for details"
      }
    }
  ],
  "version": "4"
}
