import { $ } from 'coa-helper'
import { CoaMysql } from '../typings'
import { MysqlCached } from './cMysql'
import Pager = CoaMysql.Pager
import Query = CoaMysql.Query

const scheme = {
  cooperationId: '',
  accountId: '',
  company: '',
  address: '',
  name: '',
  mobile: '',
  mail: '',
  content: '',
  type: '',
  appId: '',
  image: '',
  valid: 1,
  status: 1,
  created: 0,
  updated: 0,
  source: ''
}
const pick = ['cooperationId', 'accountId', 'company', 'address', 'valid', 'name', 'mobile', 'mail', 'content', 'type', 'appId', 'image', 'source', 'created']
const caches = { count: ['type'] }

export declare namespace Cooperation {
  type Scheme = typeof scheme
  type PartialScheme = Partial<Scheme>
}
export default new class extends MysqlCached<Cooperation.Scheme> {

  constructor () {
    super({ name: 'CrmCooperation', title: '合作申请', prefix: 'coo', scheme, pick, caches })
  }

  async getList (where: { status: number }, where2: { search: string }) {

    const query: Query = qb => {
      qb.filter(where)
      qb.search(['company', 'mobile'], where2.search)
    }

    const list = await this.findIdList([where, where2], query)

    await $.attach(list, 'cooperationId', '', ids => this.mGetByIds(ids))

    return list
  }

  async getPageList (pager: Pager, where: { status: number, valid: number, accountId: string }, where2: { search: string, filterType: string }) {

    const query: Query = qb => {
      qb.filter(where)
      qb.search(['company', 'mobile'], where2.search)
      where2.filterType === 'postcard' && qb.where('type', 'postcard')
      where2.filterType === 'notPostcard' && qb.whereNot('type', 'postcard')
    }

    const list = await this.findIdSortList([where, where2], pager, query)

    await $.attach(list.list, 'cooperationId', '', ids => this.mGetByIds(ids))

    return list
  }

  async mCountByType (types: string[]) {
    return await this.mGetCountBy('type', types)
  }

}