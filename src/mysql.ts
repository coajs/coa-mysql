import { echo } from 'coa-echo'
import { env } from 'coa-env'
import { die } from 'coa-error'
import Knex from './Knex'

const mysql = Knex({
  client: 'mysql',
  connection: {
    host: env.mysql.host,
    port: env.mysql.port,
    user: env.mysql.user,
    password: env.mysql.password,
    database: env.mysql.database,
    charset: env.mysql.charset,
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