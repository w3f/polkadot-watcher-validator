const { register } = require('prom-client')
const promClient = require('prom-client')

class Prometheus {
  constructor() {
    this._initMetrics()
  }

  startCollection() {
		console.log(
			'Starting the collection of metrics, the metrics are available on /metrics'
		)
		promClient.collectDefaultMetrics()
	}

	injectMetricsRoute(app) {
		app.get('/metrics', (req, res) => {
			res.set('Content-Type', register.contentType)
			res.end(register.metrics())
		})
	}

  increaseTotalBlocksProduced(name, account) {
    this.totalBlocksProduced.inc({name, account})
  }

  _initMetrics() {
    this.totalBlocksProduced = new promClient.Counter({
      name: 'polkadot_blocks_produced_total',
      help: 'Total number of blocks produced by a validator',
      labelNames: ['name', 'account']
    })
  }
}

module.exports = {
  Prometheus
}
