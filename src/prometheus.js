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

  increaseTotalValidatorOfflineReports(name) {
    this.totalValidatorOfflineReports.inc({name})
  }

  _initMetrics() {
    this.totalBlocksProduced = new promClient.Counter({
      name: 'polkadot_blocks_produced_total',
      help: 'Total number of blocks produced by a validator',
      labelNames: ['name', 'account']
    })
    this.totalValidatorOfflineReports = new promClient.Counter({
      name: 'polkadot_offline_validator_reports_total',
      help: 'Total times a validator has been reported offline',
      labelNames: ['name']
    })
  }
}

module.exports = {
  Prometheus
}
