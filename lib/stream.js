'use strict'

const { Transform } = require('readable-stream')
const { issue } = require('./request')

function parse (body) {
  try {
    return JSON.parse(body)
  } catch (error) {
    return { error: error, notJSON: body }
  }
}

// Returns a Transform stream for issueing Edged client actions. Write action
// objects to this stream and read results objects from it.
//
// < { action, uri }
// > { statusCode, uri, body }
function createStream (client) {
  return new Transform({
    transform ({ action, uri }, enc, cb) {
      issue(client, action, uri, (er, sc, body) => {
        this.push({ statusCode: sc, uri: uri, body: parse(body) })
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
      issue(client, action, uri, (er, sc, body) => {
        this.push({ statusCode: sc, uri: uri, body: parse(body) })
        cb(er)
      })
    },
    objectMode: true
  })
}

exports.createStream = createStream
exports.createURLStream = createURLStream
