import mCrmCooperation from '../@test/mCrmCooperation'
import cMysql, { MysqlCached } from './cMysql'

const scheme = {
  orderId: '',
  appId: '',
  accountId: '',
  memberId: '',
  skus: [],
  skuStoreIds: [],
  userMessage: '',
  managerMessage: '',
}
const pick = ['orderId', 'appId', 'accountId', 'memberId']
const caches = {}

export declare namespace TradeOrder {
  type Scheme = typeof scheme
}

class OrderCache extends MysqlCached<TradeOrder.Scheme> {

  constructor () {
    super({ name: 'TradeOrder', title: '交易订单', prefix: 'ord', scheme, pick, caches })
  }

}

export default new class {

  noop () {

  }

  async testCacheTransaction () {

    const orderCache = new OrderCache()
    // await orderCache.insert({ orderId: 'test_for_cache', appId: 'test_for_app_id', accountId: 'test_for_account_id', memberId: 'test_for_member_id', skus: [], skuStoreIds: [], userMessage: '', managerMessage: '' })

    const result = await cMysql.transaction(async trx => {
      await mCrmCooperation.insert({
        cooperationId: 'asdfadf67872226543',
        accountId: '123123',
        company: '123123',
        address: '123123',
        name: '123123',
        mobile: '123123',
        mail: '123123',
        content: '123123',
        type: '123123',
        appId: '123123',
        image: '123123',
        valid: 1,
        status: 1,
        created: 1,
        updated: 1,
        source: '123123'
      }, trx)
      await mCrmCooperation.updateById('asdfadf67872226543', { accountId: 'asfasfasf123123' }, trx)
      await orderCache.updateById('test_for_cache', { managerMessage: 'managerMessage' })
      return await orderCache.updateById('test_for_cache', { userMessage: 'userMessage' })
    })

  }
}



