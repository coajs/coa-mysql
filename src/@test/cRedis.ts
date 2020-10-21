import { RedisBin, RedisCache } from 'coa-redis'

export default new class {
  protected bin = new RedisBin({
    host: '127.0.0.1',
    port: 6379,
    password: '',
    db: 1,
    prefix: 'mm-site-d0',
    trace: false
  })
  public cache = new RedisCache(this.bin)
}