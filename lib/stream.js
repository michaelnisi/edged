'use strict'

const { Transform } = require('readable-stream')
const { issue } = require('./request')

// Returns a Transform stream for issueing Edged client actions. Write action
// objects to this stream and read results objects from it.
//
// < { action, uri }
// > { statusCode, uri, body }
function createStream (client) {
  return new Transform({
    transform (item, enc, cb) {
      const uri = item.uri.href || item.uri

      issue(client, item.action, uri, (er, sc, uri, body) => {
        this.push({ statusCode: sc, uri: uri, body: body })
        cb(er)
      })
    },
    objectMode: true
  })
}

// Returns a Transform stream for issueing Edged client actions. Write URLs
// to this stream and read results objects from it.
//
// < uri
// > { statusCode, uri, body }
function createURLStream (client, action) {
  return new Transform({
    transform (uri, enc, cb) {
      uri = uri.href || uri

      issue(client, action, uri, (er, sc, uri, body) => {
        this.push({ statusCode: sc, uri: uri, body: body })
        cb(er)
      })
    },
    objectMode: true
  })
}

exports.createStream = createStream
exports.createURLStream = createURLStream
