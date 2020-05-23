import { _, HashIds } from 'coa-helper'
import bin from './bin'

const hexIds = new HashIds('UUID-HEX', 12, '0123456789abcdef')
const hashIds = new HashIds('UUID-HASH', 12, '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ')
const store = { key1: 0, key2: 0, key3: 0, lock: false }

// hexIds进位阈值为 11 121 1331 14641 161051 1771561 19487171
// key3每次添加10000冗余进位，key1每天变化
const durationKey1 = 24 * 3600 * 1000, maxKey3 = 161051 - 14641 - 10000

export default new class {

  async init () {
    // 如果已经在执行，就忽略
    if (store.lock)
      return
    store.lock = true
    store.key1 = this.getKey1()
    store.key2 = await bin.newDailySeries(store.key1)
    store.lock = false
  }

  async series (key: string) {
    return await bin.newSeries(key)
  }

  async saltId () {
    // 预保存数据
    const result = [store.key1, store.key2, ++store.key3]
    // 某些时机下会异步更新
    if (store.key3 > maxKey3 || store.key1 !== this.getKey1()) {
      await this.init()
    }
    // 返回结果
    return result
  }

  async hexId () {
    const saltId = await this.saltId()
    // 稍微补数，控制在16位
    saltId[0] += 1331
    saltId[1] += 1331
    saltId[2] += 14641
    return hexIds.encode(saltId)
  }

  async hashId () {
    const saltId = await this.saltId()
    return hashIds.encode(saltId)
  }

  private getKey1 () {
    // 当前时间减去2020年01月01日(1577808000000)，保证36年内(2056年)不会进位
    return _.toInteger((_.now() - 1577808000000) / durationKey1)
  }

}