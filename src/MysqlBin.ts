import { echo } from 'coa-echo'
import { die } from 'coa-error'
import Knex from './Knex'
import { MysqlConfig } from './typings'

export class MysqlBin {

  public io: Knex
  public config: MysqlConfig

  constructor (config: MysqlConfig) {

    // 创建数据库连接
    const mysql_env_main = config.databases.main || die.hint('缺少主数据库配置')
    const { host, port, user, password, charset, debug } = config
    const database = mysql_env_main.database

    // 数据库连接
    const io = Knex({ client: 'mysql', connection: { host, port, user, password, database, charset, debug } })

    io.on('query-error', (error: any) => {
      echo.error(error)
      die.hint(error.sqlMessage, 400, error.errno + ': ' + error.code)
    })

    config.trace && io.on('query', (data: any) => {
      echo.grey('* SQL: %s', io.raw(data.sql, data.bindings).toString())
    })

    // 赋值
    this.config = config
    this.io = io

  }
}