This package helps you build [transform streams] that migrate, or
upgrade, [semantically versioned][semver] append-only log entries.

[transform streams]: https://nodejs.org/api/stream.html#stream_duplex_and_transform_streams

[semver]: https://www.npmjs.com/package/semver

To create a transform, pass an `Array` of `Object` in the shape:

```js
[
  {
    fromRange: SemVerRange,
    toVersion: SemVer,
    transform: function (entry, callback) {
      callback(null, [/* transformed entries */])
    }
  }
]
```

`toVersion` must be greater than all ranges that satisfy `fromRange`.

The transforms expect and emit chunks in the shape:

```js
{index: Number, version: SemVer, entry: Object}
```

## Example

This example is run as a test for the package.  It uses a few packages
from the [mississippi] streams collection.

[mississippi]: https://www.npmjs.com/package/mississippi

```javascript
var assert = require('assert')
var collect = require('collect-stream')
var from2Array = require('from2-array')
var migrate = require('migrate-versioned-log')
var pump = require('pump')

var log = [
  {index: 1, version: '1.0.0', entry: {key: 'a', value: 1}},
  {index: 2, version: '2.0.0', entry: {type: 'init', key: 'b'}},
  {index: 3, version: '2.0.0', entry: {type: 'set', key: 'b', value: 2}}
]

var migrated = [
  {index: 1, version: '2.0.0', entry: {type: 'init', key: 'a'}},
  {index: 1, version: '2.0.0', entry: {type: 'set', key: 'a', value: 1}},
  {index: 2, version: '2.0.0', entry: {type: 'init', key: 'b'}},
  {index: 3, version: '2.0.0', entry: {type: 'set', key: 'b', value: 2}}
]

collect(
  pump(
    from2Array.obj(log),
    migrate([{
      fromRange: '1.x',
      toVersion: '2.0.0',
      transform: function (entry, callback) {
        callback(null, [
          {type: 'init', key: entry.key},
          {type: 'set', key: entry.key, value: entry.value}
        ])
      }
    }])
  ),
  function (error, data) {
    assert.ifError(error)
    assert.deepEqual(data, migrated)
  }
)
```
