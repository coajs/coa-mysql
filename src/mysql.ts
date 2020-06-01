import { echo } from 'coa-echo'
import { env } from 'coa-env'
import { die } from 'coa-error'
import Knex from './Knex'

const mysql_env = env.mysql
const mysql_env_main = env.mysql.databases.main || die.hint('缺少main数据库配置')

const mysql = Knex({
  client: 'mysql',
  connection: {
    host: mysql_env.host,
    port: mysql_env.port,
    user: mysql_env.user,
    password: mysql_env.password,
    database: mysql_env_main.database,
    charset: mysql_env.charset,
  },
  debug: env.mysql.debug || false,
})

mysql.on('query-error', (error: any) => {
  echo.error(error)
  die.hint(error.sqlMessage, 400, error.errno + ': ' + error.code)
})

env.mysql.trace && mysql.on('query', (data: any) => {
  env.started && echo.grey('* SQL: %s', mysql.raw(data.sql, data.bindings).toString())
})

export default { io: mysql }