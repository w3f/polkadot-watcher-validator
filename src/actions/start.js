const express = require('express')

const config = require('../config')
const { Subscriber } = require('./subscriber')
const { Prometheus } = require('./prometheus')


module.exports = {
  do: async (cmd) => {
    const cfg = config.read(cmd.config)

    const server = new express()
    server.get('/healthcheck', async(req, res) => {
      res.status(200).send('OK!')
    })
    server.listen(cfg.port)

    const prometheus = new Prometheus()
    prometheus.injectMetricsRoute(server)
    prometheus.startCollection()

    const subscriber = new Subscriber(cfg.endpoint, cfg.subscribe)
    await subscriber.start()
  }
}
