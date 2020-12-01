import { CoaError } from 'coa-error'
import { $, _ } from 'coa-helper'
import { CoaRedis, RedisCache } from 'coa-redis'
import { secure } from 'coa-secure'
import { MysqlBin } from './MysqlBin'
import { MysqlNative } from './MysqlNative'
import { CoaMysql } from './typings'

export class MysqlCache<Scheme> extends MysqlNative<Scheme> {

  redisCache: RedisCache

  constructor (option: CoaMysql.ModelOption<Scheme>, bin: MysqlBin, redisCache: RedisCache) {
    super(option, bin)
    this.redisCache = redisCache
  }

  async insert (data: CoaMysql.SafePartial<Scheme>, trx?: CoaMysql.Transaction) {
    const id = await super.insert(data, trx)
    trx ? trx.recordDeleteCache(this.getDeleteIds([id], [data])) : await this.deleteCache([id], [data])
    return id
  }

  async mInsert (dataList: CoaMysql.SafePartial<Scheme>[], trx?: CoaMysql.Transaction) {
    const ids = await super.mInsert(dataList, trx)
    trx ? trx.recordDeleteCache(this.getDeleteIds(ids, dataList)) : await this.deleteCache(ids, dataList)
    return ids
  }

  async updateById (id: string, data: CoaMysql.SafePartial<Scheme>, trx?: CoaMysql.Transaction) {
    const dataList = await this.getCacheChangedDataList([id], data, trx)
    const result = await super.updateById(id, data, trx)
    if (result)
      trx ? trx.recordDeleteCache(this.getDeleteIds([id], dataList)) : await this.deleteCache([id], dataList)
    return result
  }

  async updateByIds (ids: string[], data: CoaMysql.SafePartial<Scheme>, trx?: CoaMysql.Transaction) {
    const dataList = await this.getCacheChangedDataList(ids, data, trx)
    const result = await super.updateByIds(ids, data, trx)
    if (result)
      trx ? trx.recordDeleteCache(this.getDeleteIds(ids, dataList)) : await this.deleteCache(ids, dataList)
    return result
  }

  async updateForQueryById (id: string, query: CoaMysql.Query, data: CoaMysql.SafePartial<Scheme>, trx?: CoaMysql.Transaction) {
    const dataList = await this.getCacheChangedDataList([id], data, trx)
    const result = await super.updateForQueryById(id, query, data, trx)
    if (result)
      trx ? trx.recordDeleteCache(this.getDeleteIds([id], dataList)) : await this.deleteCache([id], dataList)
    return result
  }

  async upsertById (id: string, data: CoaMysql.SafePartial<Scheme>, trx?: CoaMysql.Transaction) {
    const dataList = await this.getCacheChangedDataList([id], data, trx)
    const result = await super.upsertById(id, data, trx)
    trx ? trx.recordDeleteCache(this.getDeleteIds([id], dataList)) : await this.deleteCache([id], dataList)
    return result
  }

  async deleteByIds (ids: string[], trx?: CoaMysql.Transaction) {
    const dataList = await this.getCacheChangedDataList(ids, undefined, trx)
    const result = await super.deleteByIds(ids, trx)
    if (result)
      trx ? trx.recordDeleteCache(this.getDeleteIds(ids, dataList)) : await this.deleteCache(ids, dataList)
    return result
  }

  async checkById (id: string, pick = this.columns, trx?: CoaMysql.Transaction, ms = this.ms, force = false) {
    return await this.getById(id, pick, trx, ms, force) || CoaError.throw('MysqlCache.DataNotFound', `${this.title}不存在`)
  }

  async getById (id: string, pick = this.columns, trx?: CoaMysql.Transaction, ms = this.ms, force = false) {
    const result = await this.redisCache.warp(this.getCacheNsp('id'), id, () => super.getById(id, this.columns, trx), ms, force)
    return this.pickResult(result, pick)
  }

  async getIdBy (field: string, value: string | number, trx?: CoaMysql.Transaction) {
    return await this.redisCache.warp(this.getCacheNsp('index', field), '' + value, () => super.getIdBy(field, value, trx))
  }

  async mGetByIds (ids: string[], pick = this.pick, trx?: CoaMysql.Transaction, ms = this.ms, force = false) {
    const result = await this.redisCache.mWarp(this.getCacheNsp('id'), ids, ids => super.mGetByIds(ids, this.columns, trx), ms, force)
    _.forEach(result, (v, k) => result[k] = this.pickResult(v, pick))
    return result
  }

  async truncate (trx?: CoaMysql.Transaction) {
    await super.truncate(trx)
    await this.deleteCache([], [])
  }

  protected async findListCount (finger: CoaMysql.Dic<any>[], query: CoaMysql.Query, trx?: CoaMysql.Transaction) {
    const cacheNsp = this.getCacheNsp('data')
    const cacheId = 'list-count:' + secure.sha1($.sortQueryString(...finger))
    return await this.redisCache.warp(cacheNsp, cacheId, () => super.selectListCount(query, trx))
  }

  protected async findIdList (finger: CoaMysql.Dic<any>[], query: CoaMysql.Query, trx?: CoaMysql.Transaction) {
    const cacheNsp = this.getCacheNsp('data')
    const cacheId = 'list:' + secure.sha1($.sortQueryString(...finger))
    return await this.redisCache.warp(cacheNsp, cacheId, () => super.selectIdList(query, trx))
  }

  protected async findIdSortList (finger: CoaMysql.Dic<any>[], pager: CoaMysql.Pager, query: CoaMysql.Query, trx?: CoaMysql.Transaction) {
    const cacheNsp = this.getCacheNsp('data')
    const cacheId = `sort-list:${pager.rows}:${pager.last}:` + secure.sha1($.sortQueryString(...finger))
    return await this.redisCache.warp(cacheNsp, cacheId, () => super.selectIdSortList(pager, query, trx))
  }

  protected async findIdViewList (finger: CoaMysql.Dic<any>[], pager: CoaMysql.Pager, query: CoaMysql.Query, trx?: CoaMysql.Transaction) {
    const cacheNsp = this.getCacheNsp('data')
    const cacheId = `view-list:${pager.rows}:${pager.page}:` + secure.sha1($.sortQueryString(...finger))
    const count = await this.findListCount(finger, query, trx)
    return await this.redisCache.warp(cacheNsp, cacheId, () => super.selectIdViewList(pager, query, trx, count))
  }

  protected async mGetCountBy (field: string, ids: string[], trx?: CoaMysql.Transaction) {
    const cacheNsp = this.getCacheNsp('count', field)
    return await this.redisCache.mWarp(cacheNsp, ids, async ids => {
      const rows = await this.table(trx).select({ id: field }).count({ count: this.key }).whereIn(field, ids).groupBy(field) as any[]
      const result = {} as CoaMysql.Dic<number>
      _.forEach(rows, ({ id, count }) => result[id] = count)
      return result
    }) as Promise<CoaMysql.Dic<number>>
  }

  protected async getCountBy (field: string, value: string, query?: CoaMysql.Query, trx?: CoaMysql.Transaction) {
    const cacheNsp = this.getCacheNsp('count', field)
    return await this.redisCache.warp(cacheNsp, value, async () => {
      const qb = this.table(trx).count({ count: this.key })
      query ? query(qb) : qb.where(field, value)
      const rows = await qb
      return rows[0]?.count as number || 0
    })
  }

  protected pickResult<T> (data: T, pick: string[]) {
    if (!data) return null
    return _.pick(data, pick) as T
  }

  protected getCacheNsp (...nsp: string[]) {
    return this.system + ':' + this.name + ':' + nsp.join(':')
  }

  protected async getCacheChangedDataList (ids: string[], data?: CoaMysql.SafePartial<Scheme>, trx?: CoaMysql.Transaction) {
    let has = true
    const resultList = [] as CoaMysql.SafePartial<Scheme>[]
    if (data) {
      has = _.some(this.cachesFields, i => !!(data as any)[i])
      resultList.push(data)
    }
    if (has) {
      const data = await this.mGetByIds(ids, this.columns, trx, 0)
      resultList.push(..._.values(data))
    }
    return resultList
  }

  protected async deleteCache (ids: string[], dataList: CoaMysql.SafePartial<Scheme>[]) {
    await this.redisCache.mDelete(this.getDeleteIds(ids, dataList))
  }

  protected getDeleteIds (ids: string[], dataList: CoaMysql.SafePartial<Scheme>[]) {
    const deleteIds = [] as CoaRedis.CacheDelete[]
    deleteIds.push([this.getCacheNsp('id'), ids])
    deleteIds.push([this.getCacheNsp('data'), []])
    _.forEach(this.caches, (items, name) => {
      // name可能为index,count,或自定义
      items.forEach(item => {
        const keys = item.split(/[:,]/)
        const key = keys[0]
        const ids = [] as string[]
        dataList.forEach((data: any) => {
          data && data[key] && ids.push(data[key])
        })
        ids.push(...keys.slice(1))
        ids.length && deleteIds.push([this.getCacheNsp(name, key), ids])
      })
    })

    return deleteIds
  }
}
