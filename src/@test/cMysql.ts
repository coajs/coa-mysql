import { CoaMysql, MysqlBin, MysqlCache, MysqlStorage, MysqlUuid } from '..'
import { MysqlTransaction } from '../MysqlTransaction'
import cRedis from './cRedis'

const bin = new MysqlBin({
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 'root',
  charset: 'utf8mb4',
  trace: true,
  debug: false,
  databases: {
    main: { database: 'mm-site-d0', ms: 7 * 24 * 3600 * 1000 },
    kaoqin: { database: 'mm-site-kq-d0', ms: 3600 * 1000 },
  },
})

const uuid = new MysqlUuid(bin)

export class MysqlCached<Schema> extends MysqlCache<Schema> {

  constructor (option: CoaMysql.ModelOption<Schema>) {
    super(option, bin, cRedis.cache)
  }

  async newId () {
    return this.prefix + await uuid.hexId()
  }

}

export default new class {

  public uuid = uuid
  protected bin = bin
  public storage = new MysqlStorage(this.bin, cRedis.cache)

  async transaction<T> (worker: (trx: CoaMysql.Transaction) => Promise<T>) {

    const { cacheTrx, result } = await this.bin.io.transaction(async trx => {
      const cacheTrx = new MysqlTransaction(trx, cRedis.cache)
      const result = await worker(cacheTrx)
      return { cacheTrx, result }
    })

    await cacheTrx.deleteTrxCache()

    return result

  }

}