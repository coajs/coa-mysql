import { CoaRedis, RedisCache } from 'coa-redis'
import { Transaction } from 'knex'

export class MysqlTransaction {

  // 要删除的缓存
  private readonly deleteIds: CoaRedis.CacheDelete[]
  private readonly redisCache: RedisCache
  private readonly trx: Transaction

  constructor (trx: Transaction, redisCache: RedisCache) {
    this.trx = trx
    this.redisCache = redisCache
    this.deleteIds = []
  }

  getRawTrx () {
    return this.trx
  }

  async deleteTrxCache () {
    console.log('删除所有缓存', this.deleteIds)
    if (this.deleteIds.length === 0) return 0
    return await this.redisCache.mDelete(this.deleteIds)
  }

  // 记录需要删除的
  recordDeleteCache (deletes: CoaRedis.CacheDelete[]) {
    this.deleteIds.push(...deletes)
  }

}