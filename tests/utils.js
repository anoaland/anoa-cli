const { system } = require('gluegun')
const spawn = require('cross-spawn')

const utils = {
  DOWN: '\x1B\x5B\x42',
  UP: '\x1B\x5B\x41',
  ENTER: '\x0D',
  SPACE: '\x20',
  TAB: '\x09',

  /**
   * Execute command and returns the output.
   * @param {string} cmd command to run
   */
  async exec(cmd) {
    const { stdout } = await system.spawn(cmd)

    return utils.stripColorsAndPrompt(stdout)
  },

  /**
   * Get pure string without colors or any prompt character.
   * @param {Buffer|String} buff Buffer or string
   */
  stripColorsAndPrompt(buff) {
    return buff
      .toString('utf8')
      .trim()
      .replace(
        /[\r\n\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
        ''
      )
  },

  /**
   * Run wizard command.
   * @param {string} cmd command to run
   * @param {string[]} args comand arguments
   * @param {{q:string, a:string}[]} qaList list of question and answer
   * @param {(code:number)=>void} done done callback
   */
  run(cmd, args, qaList, done) {
    let finish = false
    const cp = spawn(cmd, args)
    cp.stdout.on('data', async data => {
      const question = utils.stripColorsAndPrompt(data)
      const qa = qaList.find(
        o => question.indexOf(utils.stripColorsAndPrompt(o.q)) > -1
      )

      if (qa) {
        // remove processed qa
        qaList.splice(qaList.indexOf(qa), 1)

        // process qa TAB by TAB
        const answers = qa.a.split(this.TAB)
        const ansLen = answers.length
        for (let i = 0; i < ansLen; i++) {
          const ans = answers[i]
          await this.cpWriteAsync(cp, ans)
          if (ansLen > 1 && i < ansLen - 1) {
            await this.cpWriteAsync(cp, this.TAB)
          }
        }

        // give some delay to flush garbage data
        setTimeout(async () => {
          if (!finish) {
            await this.cpWriteAsync(cp, this.ENTER)
          }
        }, 1500)
      }
    })

    cp.on('exit', code => {
      finish = true
      done(code)
    })
  },

  /**
   * Write chunk to child process asyncronously
   * @param {ChildProcess} cp Child Process
   * @param {any} chunk Chunk
   */
  async cpWriteAsync(cp, chunk) {
    return new Promise((resolve, reject) => {
      cp.stdin.write(chunk, 'utf-8', err => {
        if (!err) {
          resolve()
        } else {
          reject(err)
        }
      })
    })
  }
}

module.exports = utils
