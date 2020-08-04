import * as Knex from 'knex'

export type Dic<T> = { [key: string]: T }
export type SafePartial<T> = T extends {} ? Partial<T> : any
export type Query = (qb: Knex.QueryBuilder) => void
export type QueryBuilder = Knex.QueryBuilder
export type Transaction = Knex.Transaction
export type Pager = { rows: number, last: number, page: number }
export type ModelOption<T> = {
  name: string,
  scheme: T,
  title?: string,
  key?: string,
  prefix?: string,
  system?: string,
  increment?: string,
  pick: string[],
  unpick?: string[],
  caches?: { index?: string[], count?: string[] },
}

export interface MysqlEnv {
  host: string
  port: number
  user: string
  password: string
  charset: string
  databases: {
    [name: string]: { database: string, ms: number }
  }
  debug: boolean
  trace: boolean
}

declare module 'coa-env' {
  interface Env {
    mysql: MysqlEnv
  }
}