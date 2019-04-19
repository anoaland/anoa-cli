const gluegun = require('./__mocks__/context')
const { Utils } = require('../../dist/services/core/utils')
mockProcess = require('jest-mock-process')

describe('utils', () => {
  jest.mock('gluegun')

  test('validateProjectDir - invalid dir', async () => {
    mockExit = mockProcess.mockProcessExit()
    const utils = new Utils(gluegun())
    utils.validateProjectDir('aha sasa')
    expect(mockExit).toHaveBeenCalled()
  })

  test('validateProjectDir - valid dir', async () => {
    mockExit = mockProcess.mockProcessExit()
    const utils = new Utils(gluegun())
    utils.validateProjectDir('aha')
    expect(mockExit).not.toBeCalled()
  })

  test('isYarnInstalled - no yarn', () => {
    const utils = new Utils(gluegun({ hasYarn: false }))
    expect(utils.isYarnInstalled()).toBeFalsy()
  })

  test('isYarnInstalled - has yarn', () => {
    const utils = new Utils(gluegun({ hasYarn: true }))
    expect(utils.isYarnInstalled()).toBeTruthy()
  })

  test('askToUseYarn - should ask yarn when yarn installed', async () => {
    const utils = new Utils(gluegun({ hasYarn: true, confirm: true }))
    const result = await utils.askToUseYarn()
    expect(result).toBeTruthy()
  })

  test('askToUseYarn - should not ask yarn when yarn is not installed', async () => {
    const utils = new Utils(gluegun({ hasYarn: false, confirm: true }))
    const result = await utils.askToUseYarn()
    expect(result).toBeFalsy()
  })
})
