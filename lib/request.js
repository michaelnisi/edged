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
exports.within = within

// Returns milliseconds to wait while ts is within l.
function within (l, ts) {
  const diff = new Date().getTime() - ts

  return Math.max(0, l - diff)
}

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

      const headers = createHeaders(moreHeaders)

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

  return mod.request(opts)
}

// Issues request with action for uri. When the request-response cycle
// is complete the callback executes.
//
// cb (er, statusCode, url, body)
//
// The er and the body parameters are optional.
function issue (client, action, uri, cb = () => {}) {
  const log = client.log

  // Accepting URL and String types.
  uri = uri.href || uri

  debug(uri)

  let callback = (er, statusCode, uri, body) => {
    // Sans cb is NOP.
    cb(er, statusCode, uri, body)

    debug('request: event names: %s', req.eventNames())

    callback = () => {}
  }

  log.info('issueing: ( %s, %s )', action, uri)

  const req = createRequest(client, action, uri)

  // Managing the request

  let requested = () => {
    debug('requested')

    req.removeListener('error', requestFailed)
    req.removeListener('finish', requested)

    requested = () => {}
  }

  let failed = (statusCode = 400, er) => {
    requested()

    req.removeListener('response', responseReceived)
    req.removeListener('timeout', socketTimeoutExceeded)

    log.error('request failed: ( %s, %s )', statusCode, er)

    failed = () => {}

    callback(er, statusCode, uri, undefined)
  }

  const requestFailed = (er) => {
    failed(400, er)
  }

  req.once('error', requestFailed)

  // Monitoring the socket

  const socketTimeoutExceeded = () => {
    failed(408)
    req.abort()
  }

  req.once('timeout', socketTimeoutExceeded)

  req.setTimeout(client.timeout)

  // Receiving the reponse

  const responseReceived = (res) => {
    // The accumulated payload body.
    let body = ''

    // Exit here.
    let finish = (statusCode = res.statusCode, error) => {
      req.removeListener('timeout', socketTimeoutExceeded)

      res.removeListener('error', bodyFailed)
      res.removeListener('aborted', requestAborted)
      res.removeListener('close', connectionClosed)
      res.removeListener('end', responseEnded)
      res.removeListener('readable', dataAvailable)

      finish = () => {}

      debug('response: event names: %s', res.eventNames())

      callback(error, statusCode, uri, body)
    }

    const bodyFailed = (er) => {
      debug('bodyFailed')
      finish(422, er)
    }

    const requestAborted = () => {
      debug('requestAborted')
      finish(400)
    }

    const connectionClosed = () => {
      debug('connectionClosed')
      finish(400)
    }

    const responseEnded = () => {
      debug('responseEnded')
      finish()
    }

    res.once('error', bodyFailed)
    res.once('aborted', requestAborted)
    res.once('close', connectionClosed)
    res.once('end', responseEnded)

    if (res.statusCode === 200) {
      log.info('success: %s', uri)
    } else {
      log.warn('failure: %s', res.statusCode)
    }

    if (res.aborted) {
      return finish(400)
    }

    // Accumulating the payload body.

    const dataAvailable = () => {
      debug('dataAvailable')
      let chunk

      while ((chunk = res.read())) {
        body += chunk
      }
    }

    res.on('readable', dataAvailable)
  }

  req.once('response', responseReceived)
  req.once('finish', requested)

  req.end()
}
