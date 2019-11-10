const express = require('express')

const { Subscriber } = require('./subscriber')
const { Prometheus } = require('./prometheus')

const endpoint = 'wss://serinus-5.kusama.network'
const port = 6400

async function run() {
  const server = new express()
  server.get('/healthcheck', async(req, res) => {
    res.status(200).send('OK!')
  })
  server.listen(port)

  const prometheus = new Prometheus()
	prometheus.injectMetricsRoute(server)
	prometheus.startCollection()

  const subscriber = new Subscriber(endpoint)
  await subscriber.start()
}

run()
