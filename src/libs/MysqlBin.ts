import { echo } from 'coa-echo'
import { CoaError } from 'coa-error'
import { secure } from 'coa-secure'
import { MysqlCache } from '../services/MysqlCache'
import { CoaMysql } from '../typings'
import { Knex } from './Knex'
export class MysqlBin {
  public io: Knex
  public config: CoaMysql.Config

  constructor(config: CoaMysql.Config) {
    // 创建数据库连接
    const mysql_env_main = config.databases.main || CoaError.throw('MysqlBin.ConfigMissing', '缺少主数据库配置')
    const { host, port, user, password, charset, debug, pool } = config
    const database = mysql_env_main.database

    // 数据库连接
    const io = Knex({ client: 'mysql', connection: { host, port, user, password, database, charset, debug }, pool })

    io.on('query-error', (error: any) => {
      echo.error(error)
      CoaError.throw('MysqlBin.Error.' + error.errno + '. ' + error.code, error.sqlMessage)
    })

    config.trace &&
      io.on('query', (data: any) => {
        echo.grey('* SQL: %s', io.raw(data.sql, data.bindings).toString())
      })

    // 赋值
    this.config = config
    this.io = io
  }

  async safeTransaction<T>(handler: (trx: CoaMysql.Transaction) => Promise<T>): Promise<T> {

    let cacheTasks = {
      trxUpdateCacheTaskList: [] as Array<{ model: MysqlCache<any>, ids: string[], dataList: any[] }>,
      trxRaeadCacheNspsList: [] as Array<{ model: MysqlCache<any>, nsp: string }>
    };

    const result = await this.io.transaction(async (trx: any) => {
      trx.id ||= secure.id25(`${Date.now()}-${Math.floor(Math.random() * 1e6).toString().padStart(6, '0')}`)
      trx.trxUpdateCacheTaskList = (model: MysqlCache<any>, ids: string[], dataList: any[]) => {
        cacheTasks.trxUpdateCacheTaskList.push({ model, ids, dataList })
      }
      trx.trxRaeadCacheNspsList = (model: MysqlCache<any>, nsp: string) => {
        cacheTasks.trxRaeadCacheNspsList.push({ model, nsp })
      }
      return await handler(trx)
    })

    for (const task of cacheTasks.trxUpdateCacheTaskList) {
      await task.model.deleteCache(task.ids, task.dataList)
    }

    for (const readCacheNsp of cacheTasks.trxRaeadCacheNspsList) {
      await readCacheNsp.model.redisCache.clear(readCacheNsp.nsp)
    }
    // 初始数组 减少trx未及时销毁时的内存占用
    cacheTasks = { trxUpdateCacheTaskList: [], trxRaeadCacheNspsList: [] }

    return result
  }
}
