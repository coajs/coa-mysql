import { _, HashIds } from 'coa-helper'
import { Transaction } from 'knex'
import { MysqlBin } from '../libs/MysqlBin'
import { MemoryLock } from './MemoryLock'

const hexIds = new HashIds('UUID-HEX', 12, '0123456789abcdef')
const hashIds = new HashIds('UUID-HASH', 12, '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ')
const TableName = 'aac_uuid'

// hexIds进位阈值为 11 121 1331 14641 161051 1771561 19487171
// key3每次添加10000冗余进位，key1每天变化
const maxStep = 161051 - 11

export class MysqlUuid {

  private readonly bin: MysqlBin
  private readonly name: string
  private readonly step: number

  private key1 = 0
  private key2 = 0
  private key3 = 0

  constructor (bin: MysqlBin, name: string = 'ID', step = maxStep) {
    this.bin = bin
    this.name = name.toUpperCase()
    this.step = step
  }

  async series (key: string) {
    return await this.newSeries(key)
  }

  async saltId () {
    if (this.isNeedInit())
      await this.init()
    return [this.key1, this.key2, ++this.key3]
  }

  async hexId () {
    const saltId = await this.saltId()
    // 稍微补数，控制在16位
    saltId[0] += 1331
    saltId[1] += 1331
    saltId[2] += 14641
    return hexIds.encode(saltId)
  }

  async hashId () {
    const saltId = await this.saltId()
    return hashIds.encode(saltId)
  }

  // 每日唯一顺序码的ID
  protected getDailyId (day: number) {
    const id = '000000' + day
    return `${this.name}${id.substr(-5)}`
  }

  protected getKey1 () {
    // 当前时间减去2020年01月01日(1577808000000)，保证36年内(2056年)不会进位
    // 每天 24 * 3600 * 1000 =  86400000 毫秒,
    return _.toInteger((_.now() - 1577808000000) / 86400000)
  }

  private isNeedInit () {
    return this.key2 === 0 || this.key3 >= this.step || this.key1 !== this.getKey1()
  }

  private async init () {
    await MemoryLock.start('uuid-init', async () => {
      if (!this.isNeedInit())
        return
      this.key1 = this.getKey1()
      this.key2 = await this.getNewDailySeries(this.key1)
      this.key3 = 0
    })
  }

  // 生成新的唯一顺序码
  private async newSeries (id: string) {
    if (!this.bin.config.host) return 0
    return await this.bin.io.transaction(async (trx: Transaction) => {
      const data = await trx(TableName).first('no').where({ id }).forUpdate() || {}
      const no = _.toInteger(data.no) + 1
      if (no === 1)
        await trx(TableName).insert({ id, no })
      else
        await trx(TableName).update({ no }).where({ id })
      return no
    })
  }

  // 生成每日唯一顺序码
  private async getNewDailySeries (day: number) {
    const id = this.getDailyId(day)
    const series = await this.newSeries(id)
    // 如果为1，则删除以前的旧数据
    if (series === 1) await this.bin.io(TableName).delete()
      .where('id', 'LIKE', `${this.name}%`)
      .where('id', '<=', this.getDailyId(day - 3))
    return series
  }

}