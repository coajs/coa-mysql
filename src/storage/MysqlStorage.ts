import { RedisCache } from 'coa-redis'
import { MysqlBin } from '../MysqlBin'
import { MysqlCache } from '../MysqlCache'

const scheme = {
  key: '' as string,
  value: {} as any,
  expire: 0 as number,
}
const pick = ['key', 'value', 'expire']

export class MysqlStorage extends MysqlCache<typeof scheme> {

  constructor (bin: MysqlBin, cache: RedisCache) {
    super({ name: 'AacStorage', scheme, pick }, bin, cache)
  }

  async get<T> (key: string) {
    const { expire, value } = await super.getById(key) || { expire: 0, value: undefined }
    if (expire !== 0 && expire < Date.now()) return undefined
    return value as unknown as T
  }

  async set<T> (key: string, value: T, ms = 0) {
    const expire = ms <= 0 ? 0 : ms + Date.now()
    const result = await super.upsertById(key, { key, value, expire })
    return result > 0
  }

  async warp<T> (key: string, worker: () => Promise<T>, ms = 0) {
    let result = await this.get<T>(key)
    if (result === undefined) {
      result = await worker()
      await this.set(key, result, ms)
    }
    return result
  }

  define = <T> (key: string, _ms = 0) => ({
    get: () => this.get<T>(key),
    set: (value: T, ms = _ms) => this.set(key, value, ms),
    warp: (worker: () => Promise<T>, ms = _ms) => this.warp(key, worker, ms),
  })
  
}