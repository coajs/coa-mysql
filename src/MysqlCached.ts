import { die } from 'coa-error'
import { $, _ } from 'coa-helper'
import { cache } from 'coa-redis'
import { secure } from 'coa-secure'
import { MysqlNative } from './MysqlNative'
import { Dic, Page, Query, SafePartial, Transaction } from './typings'

export class MysqlCached<Scheme> extends MysqlNative<Scheme> {

  async insert (data: SafePartial<Scheme>, trx?: Transaction) {
    const id = await super.insert(data, trx)
    await this.cacheDeleteWork([id], [data])
    return id
  }

  async mInsert (dataList: SafePartial<Scheme>[], trx?: Transaction) {
    const ids = await super.mInsert(dataList, trx)
    await this.cacheDeleteWork(ids, dataList)
    return ids
  }

  async updateById (id: string, data: SafePartial<Scheme>, trx?: Transaction) {
    const dataList = await this.cacheChangeDataList([id], data, trx)
    const result = await super.updateById(id, data, trx)
    if (result)
      await this.cacheDeleteWork([id], dataList)
    return result
  }

  async updateForQueryById (id: string, query: Query, data: SafePartial<Scheme>, trx?: Transaction) {
    const dataList = await this.cacheChangeDataList([id], data, trx)
    const result = await super.updateForQueryById(id, query, data, trx)
    if (result)
      await this.cacheDeleteWork([id], dataList)
    return result
  }

  async upsertById (id: string, data: SafePartial<Scheme>, trx?: Transaction) {
    const dataList = await this.cacheChangeDataList([id], data, trx)
    const result = await super.upsertById(id, data, trx)
    await this.cacheDeleteWork([id], dataList)
    return result
  }

  async deleteByIds (ids: string[], trx?: Transaction) {
    const dataList = await this.cacheChangeDataList(ids, undefined, trx)
    const result = await super.deleteByIds(ids, trx)
    if (result)
      await this.cacheDeleteWork(ids, dataList)
    return result
  }

  async checkById (id: string, pick = this.columns, trx?: Transaction, ms = this.ms) {
    return await this.getById(id, pick, trx, ms) || die.hint(`${this.title}不存在`)
  }

  async getById (id: string, pick = this.columns, trx?: Transaction, ms = this.ms) {
    const result = await cache.warp(this.cacheNsp('id'), id, () => super.getById(id, this.columns, trx), ms)
    return this.pickResult(result, pick)
  }

  async getIdBy (field: string, value: string | number, trx?: Transaction) {
    return await cache.warp(this.cacheNsp('index', field), '' + value, () => super.getIdBy(field, value, trx))
  }

  async mGetByIds (ids: string[], pick = this.pick, trx?: Transaction, ms = this.ms) {
    const result = await cache.mWarp(this.cacheNsp('id'), ids, ids => super.mGetByIds(ids, this.columns, trx), ms)
    _.forEach(result, (v, k) => result[k] = this.pickResult(v, pick))
    return result
  }

  async truncate (trx?: Transaction) {
    await super.truncate(trx)
    await this.cacheDeleteWork([], [])
  }

  protected async findListCount (finger: Dic<any>[], query: Query, trx?: Transaction) {
    const cacheNsp = this.cacheNsp('data')
    const cacheId = 'list-count:' + secure.sha1($.sortQueryString(...finger))
    return await cache.warp(cacheNsp, cacheId, () => super.selectListCount(query, trx))
  }

  protected async findIdList (finger: Dic<any>[], query: Query, trx?: Transaction) {
    const cacheNsp = this.cacheNsp('data')
    const cacheId = 'list:' + secure.sha1($.sortQueryString(...finger))
    return await cache.warp(cacheNsp, cacheId, () => super.selectIdList(query, trx))
  }

  protected async findIdPageList (finger: Dic<any>[], page: Page, query: Query, trx?: Transaction) {
    const cacheNsp = this.cacheNsp('data')
    const cacheId = `page:${page.rows}:${page.last}:` + secure.sha1($.sortQueryString(...finger))
    return await cache.warp(cacheNsp, cacheId, () => super.selectIdPageList(page, query, trx))
  }

  protected async mGetCountBy (field: string, ids: string[], trx?: Transaction) {
    const cacheNsp = this.cacheNsp('count', field)
    return await cache.mWarp(cacheNsp, ids, async ids => {
      const rows = await this.table(trx).select({ id: field }).count({ count: this.key }).whereIn(field, ids).groupBy(field) as any[]
      const result = {} as Dic<number>
      _.forEach(rows, ({ id, count }) => result[id] = count)
      return result
    }) as Promise<Dic<number>>
  }

  protected async getCountBy (field: string, value: string, query?: Query, trx?: Transaction) {
    const cacheNsp = this.cacheNsp('count', field)
    return await cache.warp(cacheNsp, value, async () => {
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

  protected cacheNsp (...nsp: string[]) {
    return this.system + ':' + this.name + ':' + nsp.join(':')
  }

  private async cacheChangeDataList (ids: string[], data?: SafePartial<Scheme>, trx?: Transaction) {
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

  private async cacheDeleteWork (ids: string[], dataList: SafePartial<Scheme>[]) {
    const deleteIds = [] as CacheDelete[]
    deleteIds.push([this.cacheNsp('id'), ids])
    deleteIds.push([this.cacheNsp('data'), []])
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
        ids.length && deleteIds.push([this.cacheNsp(name, key), ids])
      })
    })
    await cache.mDelete(deleteIds)
  }
}
