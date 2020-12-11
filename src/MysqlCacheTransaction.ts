import { MysqlNativeTransaction } from './MysqlNativeTransaction'
import { CoaRedis, RedisCache } from 'coa-redis'
import * as Knex from 'knex'

export class MysqlCacheTransaction extends MysqlNativeTransaction {

  private readonly deleteIds: CoaRedis.CacheDelete[]
  private readonly redisCache: RedisCache

  constructor (trx: Knex.Transaction, redisCache: RedisCache) {
    super(trx)
    this.redisCache = redisCache
    this.deleteIds = []
  }

  // 提交事务
  async commit () {
    if (this.deleteIds.length === 0) return 0
    return await this.redisCache.mDelete(this.deleteIds)
  }

  // 删除
  onDeleteIds (deletes: CoaRedis.CacheDelete[]) {
    this.deleteIds.push(...deletes)
  }

}