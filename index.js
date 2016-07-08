var arrayFind = require('array-find')
var asyncMap = require('async.map')
var dezalgo = require('dezalgo')
var semver = require('semver')
var through2 = require('through2')

module.exports = function (transforms) {
  transforms.forEach(validateTransform)

  return through2.obj(function (chunk, encoding, done) {
    var self = this
    validateChunk(chunk, function (error) {
      if (error) done(error)
      else {
        migrate(chunk, function (error, migratedChunks) {
          if (error) done(error)
          else {
            migratedChunks.forEach(function (chunk) { self.push(chunk) })
            done()
          }
        })
      }
    })
  })

  function migrate (chunk, callback) {
    dezalgo(callback)
    var chunkVersion = chunk.version
    var transform = arrayFind(transforms, function (transform) {
      return semver.satisfies(chunkVersion, transform.fromRange)
    })
    if (transform === undefined) callback(null, [chunk])
    else {
      transform.transform(chunk.entry, function (error, migratedEntries) {
        if (error) callback(error)
        else {
          var migratedChunks = migratedEntries.map(function (migratedEntry) {
            return {
              // "Inherit" the index number of the migrated entry.
              index: chunk.index,
              // Use the version of the transform.
              version: transform.toVersion,
              entry: migratedEntry
            }
          })
          // Recurse.
          asyncMap(migratedChunks, migrate, function (error, recursed) {
            if (error) callback(error)
            else callback(null, flatten(recursed))
          })
        }
      })
    }
  }
}

function validateTransform (transform) {
  var badRange = !semver.gtr(transform.toVersion, transform.fromRange)
  if (badRange) {
    throw new Error('toVersion must be greater than fromRange')
  }
  var missingTransform = (
    !transform.hasOwnProperty('transform') ||
    typeof transform.transform !== 'function'
  )
  if (missingTransform) throw new Error('missing transform function')
}

function validateChunk (chunk, callback) {
  if (!('entry' in chunk)) callback(new Error('no entry'))
  else if (!('version' in chunk)) callback(new Error('no version'))
  else callback()
}

function flatten (arrayOfArrays) {
  return arrayOfArrays.reduce(function (flattened, element) {
    return flattened.concat(element)
  }, [])
}
