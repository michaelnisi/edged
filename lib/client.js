'use strict'

const { createStream, createURLStream } = require('./stream')
const { debuglog } = require('util')
const { api, issue } = require('./request')

const debug = debuglog('edged')

exports.createLogger = createLogger

// Returns fallback logger.
function createLogger () {
  return {
    fatal: debug,
    error: debug,
    warn: debug,
    info: debug,
    debug: debug,
    trace: debug
  }
}

// A client for a reverse proxy API.
class Edged {
  constructor (
    token,
    auth,
    agent,
    log = createLogger(),
    port = 443,
    timeout = 1e4
  ) {
    this.token = token
    this.auth = auth
    this.agent = agent
    this.log = log
    this.port = port
    this.timeout = timeout
    log.info('Edged initialized')
  }

  // Purges a single uri.
  purgeByURL (uri, cb) {
    issue(this, api.purge, uri, cb)
  }

  // Marks uri as outdated (stale) instead of permanently purging.
  softPurgeByURL (uri, cb) {
    issue(this, api.softPurge, uri, cb)
  }
}

Edged.action = api
Edged.createStream = createStream
Edged.createURLStream = createURLStream

exports.Edged = Edged
