'use strict'

const http = require('http')
const https = require('https')
const { URL } = require('url')
const { debuglog } = require('util')

const debug = debuglog('edged')

// Enumerates implemented Edged client actions.
const api = {
  purge: Symbol('purge'),
  softPurge: Symbol('softPurge')
}

exports.api = api
exports.createRequest = createRequest
exports.issue = issue

function createHeaders (client, moreHeaders) {
  let headers = {
    'accept': 'application/json'
  }

  Object.assign(headers, moreHeaders)

  if (typeof client.token === 'string') {
    headers['Fastly-Key'] = client.token
  }

  return headers
}

function RequestOptions (client, headers, hostname, method, path) {
  this.agent = client.agent
  this.auth = client.auth
  this.headers = headers
  this.hostname = hostname
  this.method = method
  this.path = path
  this.port = client.port
}

function createRequestOptions (client, action, uri) {
  switch (action) {
    case api.purge:
    case api.softPurge:
      const { hostname, pathname } = new URL(uri)

      let moreHeaders

      if (action === api.softPurge) {
        moreHeaders = { 'Fastly-Soft-Purge': 1 }
      }

      const headers = createHeaders(client, moreHeaders)

      return new RequestOptions(client, headers, hostname, 'PURGE', pathname)

    default:
      throw Error('no action')
  }
}

// Returns a request for client, action, and uri.
function createRequest (client, action, uri) {
  const opts = createRequestOptions(client, action, uri)
  const mod = opts.port === 443 ? https : http

  debug('creating request: %o', opts)

  const req = mod.request(opts)

  req.setTimeout(client.timeout)

  return req
}

// Returns a response handler closing over cb.
function createResponseHandler (cb = () => {}) {
  return (res) => {
    const { statusCode } = res

    const onError = (er) => {
      invalidate(422, er)
    }

    const onAborted = () => {
      invalidate(400)
    }

    const onClose = () => {
      invalidate(400)
    }

    const onEnd = () => {
      invalidate()
    }

    let chunks = []

    const onReadable = () => {
      let chunk
      while ((chunk = res.read())) {
        chunks.push(chunk)
      }
    }

    let invalidate = (sc = statusCode, error) => {
      res.removeListener('error', onError)
      res.removeListener('aborted', onAborted)
      res.removeListener('close', onClose)
      res.removeListener('end', onEnd)
      res.removeListener('readable', onReadable)

      invalidate = () => {
        debug(new Error('multiple invalidations'))
      }

      const body = Buffer.concat(chunks).toString()

      debug('response invalidated: %s', res.eventNames())
      cb(error, sc, body)
    }

    const install = () => {
      res.once('error', onError)
      res.once('aborted', onAborted)
      res.once('close', onClose)
      res.once('end', onEnd)
      res.on('readable', onReadable)
    }

    res.aborted ? invalidate(400) : install()
  }
}

// Issues request with action for uri. When the request-response cycle
// is complete the callback executes.
//
// cb (er, statusCode, body)
//
// The er and the body parameters are optional.
function issue (client, action, uri, cb = () => {}) {
  const { log } = client
  uri = uri.href || uri

  log.info('issueing: ( %s, %s )', action, uri)

  const req = createRequest(client, action, uri)

  let invalidate = (er, statusCode, body) => {
    req.removeListener('response', onResponse)
    req.removeListener('timeout', onTimeout)
    req.removeListener('error', onError)

    invalidate = () => {
      debug(new Error('multiple invalidations'))
    }

    debug('request invalidated: %s', req.eventNames())
    cb(er, statusCode, body)
  }

  const onError = (er) => {
    invalidate(er, 400)
  }

  const onTimeout = () => {
    req.abort()
    invalidate(new Error('socket timeout'), 400)
  }

  const onResponse = createResponseHandler(invalidate)

  const install = () => {
    req.once('timeout', onTimeout)
    req.once('error', onError)
    req.once('response', onResponse)
  }

  install()
  req.end()
}
