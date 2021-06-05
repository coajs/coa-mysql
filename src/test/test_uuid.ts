/* eslint-disable no-async-promise-executor */
/* eslint-disable @typescript-eslint/no-misused-promises */
import { $, _ } from 'coa-helper'
import cMysql from './cMysql'

export default new (class {
  noop() {}

  async testUuid() {
    const workers = _.times(
      100,
      async (i) =>
        await new Promise<void>(async (resolve) => {
          await $.timeout(_.random(1, 10))
          const id = await cMysql.uuid.saltId()
          console.log(i, id)
          resolve()
        })
    )
    await Promise.all(workers)
  }
})()
