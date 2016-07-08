var arrayFind = require('array-find')
var asyncMap = require('async.map')
var dezalgo = require('dezalgo')
var semver = require('semver')
var through2 = require('through2')

module.exports = function (transforms) {
  transforms.forEach(function (transform) {
    var badRange = !semver.gtr(transform.toVersion, transform.fromRange)
    if (badRange) {
      throw new Error('toVersion must be greater than fromRange')
    }
    var missingTransform = (
      !transform.hasOwnProperty('transform') ||
      typeof transform.transform !== 'function'
    )
    if (missingTransform) throw new Error('missing transform function')
  })

  return through2.obj(function (chunk, encoding, done) {
    var self = this
    if (!('entry' in chunk)) done(new Error('no entry'))
    else if (!('version' in chunk)) done(new Error('no version'))
    else {
      migrate(chunk, function (error, newChunks) {
        if (error) done(error)
        else {
          newChunks.forEach(function (chunk) { self.push(chunk) })
          done()
        }
      })
    }
  })

  function migrate (chunk, callback) {
    dezalgo(callback)
    var chunkVersion = chunk.version
    var transform = arrayFind(transforms, function (transform) {
      return semver.satisfies(chunkVersion, transform.fromRange)
    })
    if (transform === undefined) callback(null, [chunk])
    else {
      transform.transform(chunk.entry, function (error, newEntries) {
        if (error) callback(error)
        else {
          var newChunks = newEntries.map(function (entry) {
            return {
              index: chunk.index,
              version: transform.toVersion,
              entry: entry
            }
          })
          asyncMap(newChunks, migrate, function (error, newChunks) {
            if (error) callback(error)
            else callback(null, flatten(newChunks))
          })
        }
      })
    }
  }
}

function flatten (array) {
  return array.reduce(function (flattened, element) {
    return flattened.concat(element)
  }, [])
}
