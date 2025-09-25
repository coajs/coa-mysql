import { RedisCache } from "coa-redis"
import { MysqlBin } from "../libs/MysqlBin"
import { CoaMysql } from "../typings"

export class MysqlSafeTransaction {
    private readonly bin: MysqlBin
    private readonly cache: RedisCache

    constructor(bin: MysqlBin, cache: RedisCache) {
        this.bin = bin
        this.cache = cache
    }

    async safeTransaction<T>(handler: (trx: CoaMysql.Transaction) => Promise<T>): Promise<T> {
        let clearCacheNsps: any[] = []
        const result = await this.bin.io.transaction(async (trx: any) => {
            const result = await handler(trx)
            clearCacheNsps = trx.clearCacheNsps || []
            return result
        })

        if (clearCacheNsps.length > 0) { await this.cache.mDelete(clearCacheNsps) }
        return result
    }
}