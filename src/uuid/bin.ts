import { env } from 'coa-env'
import { _ } from 'coa-helper'
import mysql from '../mysql'

const tableName = 'aac_uuid'

export default new class {

  // 生成新的唯一顺序码
  async newSeries (id: string) {
    if (!env.mysql.host) return 0
    return await mysql.io.transaction(async trx => {
      const data = await trx(tableName).first('no').where({ id }).forUpdate() || {}
      const no = _.toInteger(data.no) + 1
      if (no === 1)
        await trx(tableName).insert({ id, no })
      else
        await trx(tableName).update({ no }).where({ id })
      return no
    })
  }

  // 生成每日唯一顺序码
  async newDailySeries (day: number) {
    const id = this.getDailyId(day)
    const series = await this.newSeries(id)
    // 如果为1，则删除以前的旧数据
    if (series === 1) await mysql.io(tableName).delete()
      .where('id', 'LIKE', 'ID%')
      .where('id', '<', this.getDailyId(day - 3))
    return series
  }

  // 每日唯一顺序码的ID
  private getDailyId (day: number) {
    const id = '000000' + day
    return 'ID' + id.substr(-5)
  }

}