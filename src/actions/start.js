const express = require('express')

const { Config } = require('../config')
const { Subscriber } = require('../subscriber')
const { Prometheus } = require('../prometheus')


module.exports = {
  do: async (cmd) => {
    const cfg = Config.parse(cmd.config)

    const server = new express()
    server.get('/healthcheck', async(req, res) => {
      res.status(200).send('OK!')
    })
    server.listen(cfg.port)

    const prometheus = new Prometheus()
    prometheus.injectMetricsRoute(server)
    prometheus.startCollection()

    const subscriberCfg = {
      endpoint: cfg.endpoint,
      subscribe: cfg.subscribe,
      prometheus
    }
    const subscriber = new Subscriber(subscriberCfg)
    await subscriber.start()
  }
}
