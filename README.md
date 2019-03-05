# edged - reverse proxy client

The **edged** [Node.js](https://nodejs.org) package implements a tiny subset of the [Fastly](https://fastly.com/) reverse proxy [API](https://docs.fastly.com/api). And even that’s bragging, what it does is [purging](https://docs.fastly.com/guides/purging/) single items at the edge of the network.

## Types

```js
class Edged
```

`Edged` is the main object in this package.

- `token: String`

Your Edged API token.

- `auth: String`

Optinally basic authentication credentials can be passed.

- `agent: http.Agent | https.Agent`

You might want to configure the agent to use keep-alive connections.

- `log: { fatal, error, warn, info, debug, trace }`

A conventional logging API is supported.

- `port: Number`

The port to connect to. 443 is the default.

- `timeout: Number`

Limits the time the socket is allowed to be idle, defaults to ten seconds.

## Creating a client

```js
const { Edged } = require('edged')

const client = new Edged(token)
```

By default, Edged doesn’t require an API token for purging.

## Purging URLs

```js
client.purgeByURL (uri, cb)
```

Purges a single URL.

```js
client.softPurgeByURL (uri, cb)
```

Marks URL as outdated (stale) instead of permanently purging.

## Streaming API

```
{ statusCode, uri, body }
```

Result objects form these streams.

```
Edged.createStream (client)
```

Write `{ action, uri }` to this stream and read result objects.

```
Edged.createURLStream (client, action)
```

Pick the action at construction time and write URLs, String or URL types, to this stream.

## Installing

With npm, do:

```
$ npm install edged
```

## License

[MIT License](https://github.com/michaelnisi/edged/blob/master/LICENSE)
