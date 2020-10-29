import { MysqlNative } from './MysqlNative'
import { RedisCache } from 'coa-redis'
import { MysqlBin } from './MysqlBin'
import { Dic, ModelOption, Pager, Query, SafePartial, Transaction } from './typings'
import { die } from 'coa-error'
import { secure } from 'coa-secure'
import { $, _ } from 'coa-helper'
import { CacheDelete } from 'coa-redis/typings'

export class MysqlCache<Scheme> extends MysqlNative<Scheme> {

  redisCache: RedisCache

  constructor (option: ModelOption<Scheme>, bin: MysqlBin, redisCache: RedisCache) {
    super(option, bin)
    this.redisCache = redisCache
  }

  async insert (data: SafePartial<Scheme>, trx?: Transaction) {
    const id = await super.insert(data, trx)
    await this.deleteCache([id], [data])
    return id
  }

  async mInsert (dataList: SafePartial<Scheme>[], trx?: Transaction) {
    const ids = await super.mInsert(dataList, trx)
    await this.deleteCache(ids, dataList)
    return ids
  }

  async updateById (id: string, data: SafePartial<Scheme>, trx?: Transaction) {
    const dataList = await this.getCacheChangedDataList([id], data, trx)
    const result = await super.updateById(id, data, trx)
    if (result)
      await this.deleteCache([id], dataList)
    return result
  }

  async updateByIds (ids: string[], data: SafePartial<Scheme>, trx?: Transaction) {
    const dataList = await this.getCacheChangedDataList(ids, data, trx)
    const result = await super.updateByIds(ids, data, trx)
    if (result)
      await this.deleteCache(ids, dataList)
    return result
  }

  async updateForQueryById (id: string, query: Query, data: SafePartial<Scheme>, trx?: Transaction) {
    const dataList = await this.getCacheChangedDataList([id], data, trx)
    const result = await super.updateForQueryById(id, query, data, trx)
    if (result)
      await this.deleteCache([id], dataList)
    return result
  }

  async upsertById (id: string, data: SafePartial<Scheme>, trx?: Transaction) {
    const dataList = await this.getCacheChangedDataList([id], data, trx)
    const result = await super.upsertById(id, data, trx)
    await this.deleteCache([id], dataList)
    return result
  }

  async deleteByIds (ids: string[], trx?: Transaction) {
    const dataList = await this.getCacheChangedDataList(ids, undefined, trx)
    const result = await super.deleteByIds(ids, trx)
    if (result)
      await this.deleteCache(ids, dataList)
    return result
  }

  async checkById (id: string, pick = this.columns, trx?: Transaction, ms = this.ms, force = false) {
    return await this.getById(id, pick, trx, ms, force) || die.hint(`${this.title}不存在`)
  }

  async getById (id: string, pick = this.columns, trx?: Transaction, ms = this.ms, force = false) {
    const result = await this.redisCache.warp(this.getCacheNsp('id'), id, () => super.getById(id, this.columns, trx), ms, force)
    return this.pickResult(result, pick)
  }

  async getIdBy (field: string, value: string | number, trx?: Transaction) {
    return await this.redisCache.warp(this.getCacheNsp('index', field), '' + value, () => super.getIdBy(field, value, trx))
  }

  async mGetByIds (ids: string[], pick = this.pick, trx?: Transaction, ms = this.ms, force = false) {
    const result = await this.redisCache.mWarp(this.getCacheNsp('id'), ids, ids => super.mGetByIds(ids, this.columns, trx), ms, force)
    _.forEach(result, (v, k) => result[k] = this.pickResult(v, pick))
    return result
  }

  async truncate (trx?: Transaction) {
    await super.truncate(trx)
    await this.deleteCache([], [])
  }

  protected async findListCount (finger: Dic<any>[], query: Query, trx?: Transaction) {
    const cacheNsp = this.getCacheNsp('data')
    const cacheId = 'list-count:' + secure.sha1($.sortQueryString(...finger))
    return await this.redisCache.warp(cacheNsp, cacheId, () => super.selectListCount(query, trx))
  }

  protected async findIdList (finger: Dic<any>[], query: Query, trx?: Transaction) {
    const cacheNsp = this.getCacheNsp('data')
    const cacheId = 'list:' + secure.sha1($.sortQueryString(...finger))
    return await this.redisCache.warp(cacheNsp, cacheId, () => super.selectIdList(query, trx))
  }

  protected async findIdSortList (finger: Dic<any>[], pager: Pager, query: Query, trx?: Transaction) {
    const cacheNsp = this.getCacheNsp('data')
    const cacheId = `sort-list:${pager.rows}:${pager.last}:` + secure.sha1($.sortQueryString(...finger))
    return await this.redisCache.warp(cacheNsp, cacheId, () => super.selectIdSortList(pager, query, trx))
  }

  protected async findIdViewList (finger: Dic<any>[], pager: Pager, query: Query, trx?: Transaction) {
    const cacheNsp = this.getCacheNsp('data')
    const cacheId = `view-list:${pager.rows}:${pager.page}:` + secure.sha1($.sortQueryString(...finger))
    const count = await this.findListCount(finger, query, trx)
    return await this.redisCache.warp(cacheNsp, cacheId, () => super.selectIdViewList(pager, query, trx, count))
  }

  protected async mGetCountBy (field: string, ids: string[], trx?: Transaction) {
    const cacheNsp = this.getCacheNsp('count', field)
    return await this.redisCache.mWarp(cacheNsp, ids, async ids => {
      const rows = await this.table(trx).select({ id: field }).count({ count: this.key }).whereIn(field, ids).groupBy(field) as any[]
      const result = {} as Dic<number>
      _.forEach(rows, ({ id, count }) => result[id] = count)
      return result
    }) as Promise<Dic<number>>
  }

  protected async getCountBy (field: string, value: string, query?: Query, trx?: Transaction) {
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

  protected async getCacheChangedDataList (ids: string[], data?: SafePartial<Scheme>, trx?: Transaction) {
    let has = true
    const resultList = [] as SafePartial<Scheme>[]
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

  protected async deleteCache (ids: string[], dataList: SafePartial<Scheme>[]) {
    const deleteIds = [] as CacheDelete[]
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
    await this.redisCache.mDelete(deleteIds)
  }
}