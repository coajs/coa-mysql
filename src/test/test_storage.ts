import { echo } from 'coa-echo'
import { $, _ } from 'coa-helper'
import cMysql from './cMysql'

export default new (class {
  noop() {}

  async testStorageTimeout() {
    const key = 'test' + _.random(10, 99)
    const value1 = { a: _.random(100, 999) }
    const value2 = { a: _.random(1000, 9999) }
    const ms = 1000

    await cMysql.storage.set(key, value1, ms)
    await cMysql.storage.set(key, value2, ms)

    const get1 = await cMysql.storage.get(key)
    echo.log('get1', get1)

    await $.timeout(ms + 1)

    const get2 = await cMysql.storage.get(key)
    echo.log('get2', get2)
  }

  async testStorageUpdate() {
    const key = 'test' + _.random(10, 99)
    const value1 = { a: _.random(100, 999) }
    const value2 = { a: _.random(1000, 9999) }
    const ms = 1000

    await cMysql.storage.set(key, value1, ms)

    const get1 = await cMysql.storage.get(key)
    echo.log('get1', get1)

    await cMysql.storage.set(key, value2, ms)

    const get2 = await cMysql.storage.get(key)
    echo.log('get2', get2)

    await cMysql.storage.get(key)
  }
})()
