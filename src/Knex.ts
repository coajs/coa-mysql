import { _ } from 'coa-helper'
import * as Knex from 'knex'
import { Dic } from './typings'

declare module 'knex' {
  interface QueryBuilder {

    search<TRecord, TResult> (columns: string[], value: string): Knex.QueryBuilder<TRecord, TResult>

    filter<TRecord, TResult> (data: Dic<string | number>, table?: string): Knex.QueryBuilder<TRecord, TResult>

    inArray<TRecord, TResult> (array_column: string, value: string | number): Knex.QueryBuilder<TRecord, TResult>
  }
}

Knex.QueryBuilder.extend('search', function (columns: string[], value: string) {
  const length = columns.length
  if (!value || !length) return this.where({})
  const search = '%' + value + '%'
  return this.where(qb => {
    if (length >= 1) qb.where(columns[0], 'like', search)
    if (length >= 2) for (let i = 1; i < length; i++) qb.orWhere(columns[i], 'like', search)
  })
})
Knex.QueryBuilder.extend('filter', function (data: Dic<string | number>, table?: string) {
  data = _.pickBy(data)
  if (table) data = _.mapKeys(data, (v, k) => table + '.' + k)
  return this.where(data)
})
Knex.QueryBuilder.extend('inArray', function (array_column: string, value: string | number) {
  if (!array_column || !value) return this.where({})
  return this.whereRaw('JSON_CONTAINS( ??, JSON_ARRAY( ? ) )', [array_column, value])
})

export default Knex