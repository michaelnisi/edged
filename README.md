# edged - reverse proxy client

The **edged** [Node.js](https://nodejs.org) package implements a client for a tiny subset of the [Fastly](https://fastly.com/) reverse proxy [API](https://docs.fastly.com/api). And even that’s bragging, what it does is [purging](https://docs.fastly.com/guides/purging/) single items at the edge of the network using that API.

## Types

```js
class Edged
```

`Edged` is the main object in this package.

### Properties

- `token: String`

Your Edged API token.

- `auth: String`

Optionally basic authentication credentials can be passed.

- `agent: http.Agent | https.Agent`

You might want to configure the agent to use keep-alive connections.

- `log: { fatal, error, warn, info, debug, trace }`

A conventional logging API is supported.

- `port: Number`

The port to connect to. 443 is the default.

- `timeout: Number`

Limits the time the socket is allowed to be idle, defaults to ten seconds.

### Class properties

- `action: { String: Symbol }`

Enumerates possible actions. These are the things you can do with the client.

## Creating a client

```js
const { Edged } = require('edged')

const client = new Edged(token)
```

By default, Fastly doesn’t require an API token for purging.

## Purging URLs

```js
cb (Error | undefined, Number, String)
```

The callback of these methods receives an error if something went wrong, the HTTP status code of the response, and its body.

```js
client.purgeByURL (uri, cb)
```

Purges a single URL executing the callback when done.

```js
client.softPurgeByURL (uri, cb)
```

Marks URL as outdated (stale) instead of permanently purging it, executing the callback when done.

## Streaming API

Often times you want to purge not just one URL, but many, maybe URLs you receive from a stream. 🚰

```js
{ statusCode, uri, body }
```

Result objects, readable from these streams, contain an HTTP status code received from Fastly, the URL that was attempted to purge, and the body of the HTTP response parsed as JSON if possible.

```js
Edged.createStream (client)
```

Returns a flexible action stream, to which you write  `{ Edged.action, uri }` and read result objects.

```js
Edged.createURLStream (client, Edged.action)
```

Returns a specialized stream for an action you choose up-front. Write URLs, as `String` or `URL` types, to this stream.

## Installing

With [npm](https://www.npmjs.com/package/edged), do:

```
$ npm install edged
```

## License

[MIT License](https://github.com/michaelnisi/edged/blob/master/LICENSE)
