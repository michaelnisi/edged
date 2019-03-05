#!/usr/bin/env node

// repl - access Edged with a REPL

const repl = require('repl')
const { Edged } = require('./')
const { inspect } = require('util')
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
      console.log(inspect(obj, { colors: true }))
      cb()
    },
    objectMode: true
  }), er => {
    console.log(er || 'ok')
    server.displayPrompt()
  })

  return s
}

function clear () {
  process.stdout.write('\u001B[2J\u001B[0;0f')
}

const ctx = server.context

ctx.Edged = Edged
ctx.clear = clear
ctx.env = env
ctx.client = client

ctx.action = createPipeline(Edged.createStream(client))
ctx.purge = createPipeline(Edged.createStream(client, Edged.action.purge))
ctx.softPurge = createPipeline(Edged.createStream(client, Edged.action.softPurge))
