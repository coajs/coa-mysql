import { RedisCache } from 'coa-redis'
import { MysqlBin } from './MysqlBin'
import { MysqlCacheTransaction } from './MysqlCacheTransaction'

export class Transaction<T> {

  bin: MysqlBin
  cache: RedisCache

  constructor (bin: MysqlBin, cache: RedisCache) {
    this.bin = bin
    this.cache = cache
  }

  async transactionCache (worker: (trx: MysqlCacheTransaction) => Promise<T>) {

    return await this.bin.io.transaction(async trx => {
      const cacheTrx = new MysqlCacheTransaction(trx, this.cache)
      const result = await worker(cacheTrx)
      await cacheTrx.commit()
      return result
    })

  }

}