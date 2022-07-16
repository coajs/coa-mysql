import { echo } from 'coa-echo'
import { CoaError } from 'coa-error'
import { Knex } from './Knex'
import { CoaMysql } from '../typings'

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
}
