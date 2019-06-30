'use strict'

/**
 * ref:
 * https://github.com/ewnd9/inquirer-test/blob/6e2c40bbd39a061d3e52a8b1ee52cdac88f8d7f7/index.js
 * https://medium.com/@zorrodg/integration-tests-on-node-js-cli-part-2-testing-interaction-user-input-6f345d4b713a
 */

const path = require('path')
const spawn = require('cross-spawn')
const concat = require('concat-stream')
const ANOA = path.join(process.cwd(), 'bin', 'anoa')

const runner = {
  DOWN: '\x1B\x5B\x42',
  UP: '\x1B\x5B\x41',
  ENTER: '\x0D',
  SPACE: '\x20',
  TAB: '\x09',

  run(args, inputs = [], timeout = 2500) {
    if (process.env.CI) {
      // running in CI
      timeout *= 5
    }

    var proc = spawn(ANOA, args, {
      stdio: [null, null, null]
    })
    proc.stdin.setEncoding('utf-8')

    var loop = function(inpts) {
      if (inpts.length > 0) {
        setTimeout(function() {
          proc.stdin.write(inpts[0])
          loop(inpts.slice(1))
        }, timeout)
      } else {
        proc.stdin.end()
      }
    }

    // proc.stdout.on('data', data => {
    //   console.log('spawn data', data.toString())
    // })

    // proc.stderr.on('data', data => {
    //   console.log('spawn error data', data.toString())
    // })

    // proc.stderr.on('error', data => {
    //   console.log('spawn error', data.toString())
    // })

    loop(inputs)

    return new Promise(function(resolve) {
      proc.stdout.pipe(
        concat(function(result) {
          resolve(runner.stripColorsAndPrompt(result))
        })
      )
    })
  },

  stripColorsAndPrompt(buff) {
    return buff
      .toString('utf8')
      .trim()
      .replace(
        /[\r\n\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
        ''
      )
  }
}

module.exports = runner
