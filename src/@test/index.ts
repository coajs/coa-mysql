import { $ } from 'coa-helper'
import test_cache_transaction from './test_cache_transaction'
import test_storage from './test_storage'
import test_uuid from './test_uuid'

$.run(async () => {
  await test_storage.noop()
  await test_uuid.noop()
  await test_cache_transaction.noop()

  // await test_storage.testStorageTimeout()
  // await test_storage.testStorageUpdate()
  // await test_uuid.testUuid()
  await test_cache_transaction.testCacheTransaction()

})

