```javascript
var assert = require('assert')
var collect = require('collect-stream')
var from2Array = require('from2-array')
var migrate = require('migrate-versioned-log')
var pump = require('pump')

var log = [
  {index: 1, version: '1.0.0', entry: {key: 'a', value: 1}},
  {index: 2, version: '2.0.0', entry: {type: 'init', key: 'b'}},
  {index: 2, version: '2.0.0', entry: {type: 'set', key: 'b', value: 2}}
]

var migrated = [
  {index: 1, version: '2.0.0', entry: {type: 'init', key: 'a'}},
  {index: 1, version: '2.0.0', entry: {type: 'set', key: 'a', value: 1}},
  {index: 2, version: '2.0.0', entry: {type: 'init', key: 'b'}},
  {index: 2, version: '2.0.0', entry: {type: 'set', key: 'b', value: 2}}
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
