import Knex = require('knex')

export class MysqlNativeTransaction {

  rawTrx: Knex.Transaction

  constructor (trx: Knex.Transaction) {
    this.rawTrx = trx
  }

}