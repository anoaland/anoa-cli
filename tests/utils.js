const { system } = require('gluegun')
const spawn = require('cross-spawn')

const utils = {
  DOWN: '\x1B\x5B\x42',
  UP: '\x1B\x5B\x41',
  ENTER: '\x0D',
  SPACE: '\x20',

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
    const cp = spawn(cmd, args)
    cp.stdout.on('data', data => {
      const question = utils.stripColorsAndPrompt(data)
      const qa = qaList.find(
        o => question.indexOf(utils.stripColorsAndPrompt(o.q)) > -1
      )
      if (qa) {
        qaList.splice(qaList.indexOf(qa), 1)
        cp.stdin.write(qa.a + this.ENTER)
      }
    })

    cp.on('exit', code => {
      done(code)
    })
  }
}

module.exports = utils
