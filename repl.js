#!/usr/bin/env node

// repl - walk on the edge

const repl = require('repl')
const { Edged } = require('./')
const { log, clear, dir } = require('console')
const { pipeline, Writable } = require('readable-stream')

const server = repl.start({
  ignoreUndefined: true,
  input: process.stdin,
  output: process.stdout,
  prompt: 'edged> ',
  useColors: true
})

function env () {
  return {
    auth: process.env.EDGE_AUTH,
    token: process.env.EDGE_TOKEN
  }
}

function createEdged () {
  const { token, auth } = env()

  return new Edged(token, auth)
}

const client = createEdged()

function createPipeline (s) {
  pipeline(s, new Writable({
    write (obj, enc, cb) {
      dir(obj, { colors: true })
      server.displayPrompt()
      cb()
    },
    objectMode: true
  }), er => {
    log(er || 'ok')
    server.displayPrompt()
  })

  return s
}

const { context } = server

context.Edged = Edged
context.clear = clear
context.env = env
context.client = client

context.action = createPipeline(Edged.createStream(client))
context.purge = createPipeline(Edged.createURLStream(client, Edged.action.purge))
context.softPurge = createPipeline(Edged.createURLStream(client, Edged.action.softPurge))
