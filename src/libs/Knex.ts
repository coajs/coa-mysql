/* eslint-disable @typescript-eslint/method-signature-style */
import { _ } from 'coa-helper'
import * as Knex from 'knex'
import { CoaMysql } from '../typings'

declare module 'knex' {
  interface QueryBuilder {
    search<TRecord, TResult>(columns: string[], value: string): Knex.QueryBuilder<TRecord, TResult>

    filter<TRecord, TResult>(data: CoaMysql.Dic<string | number>, table?: string): Knex.QueryBuilder<TRecord, TResult>

    period<TRecord, TResult>(column: string, from: number, to: number): Knex.QueryBuilder<TRecord, TResult>

    inArray<TRecord, TResult>(array_column: string, value: string | number): Knex.QueryBuilder<TRecord, TResult>
  }
}

// 搜索语法糖，可以搜索多个列
Knex.QueryBuilder.extend('search', function (columns: string[], value: string) {
  const length = columns.length
  value &&
    length &&
    this.where(qb => {
      const search = '%' + value + '%'
      if (length >= 1) qb.where(columns[0], 'like', search)
      if (length >= 2) for (let i = 1; i < length; i++) qb.orWhere(columns[i], 'like', search)
    })
  return this
})
// 筛选语法糖，可以筛选出对应数据，如果传否值，则会被忽略
Knex.QueryBuilder.extend('filter', function (data: CoaMysql.Dic<string | number>, table?: string) {
  data = _.pickBy(data)
  if (table) data = _.mapKeys(data, (v, k) => table + '.' + k)
  return this.where(data)
})
// 时段筛选语法糖，根据列名和开始结束时间筛选
Knex.QueryBuilder.extend('period', function (column: string, from: number, to: number) {
  column && from > 0 && this.where(column, '>=', from)
  column && to > 0 && this.where(column, '<=', to)
  return this
})
// 判断是否在数组中
Knex.QueryBuilder.extend('inArray', function (array_column: string, value: string | number) {
  array_column && value && this.whereRaw('JSON_CONTAINS( ??, JSON_ARRAY( ? ) )', [array_column, value])
  return this
})

export { Knex }
