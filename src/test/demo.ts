/* eslint-disable @typescript-eslint/no-redeclare */
// @ts-nocheck
import { $ } from 'coa-helper'
import { RedisBin, RedisCache } from 'coa-redis'
import { MysqlBin, MysqlCache } from '..'
// MySQL配置
const mysqlConfig = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: '19990728',
  charset: 'utf8mb4',
  trace: true,
  debug: false,
  databases: {
    main: { database: 'mm-site-t1', ms: 7 * 24 * 3600 * 1000 },
  },
}

const redisConfig = {
  host: '127.0.0.1',
  port: 6379,
  password: '',
  db: 1,
  prefix: '',
  trace: false,

}
const redisBin = new RedisBin(redisConfig)
const redisCache = new RedisCache(redisBin)

// 初始化Mysql基本连接，后续所有模型均依赖此实例
const mysqlBin = new MysqlBin(mysqlConfig)

const userScheme = {
  userId: '' as string,
  name: '' as string,
  mobile: '' as string,
  avatar: '' as string,
  gender: 1 as number,
  language: '' as string,
  status: 1 as number,
  created: 0 as number,
  updated: 0 as number,
}

// const userScheme1 = {
//   userId: '' as string,
//   name: '' as string,
//   mobile: '' as string,
//   avatar: '' as string,
//   gender: 1 as number,
//   language: '' as string,
//   status: 1 as number,
//   created: 0 as number,
//   updated: 0 as number,
// }

// 定义User类型（通过默认结构自动生成）
type UserScheme = typeof userScheme


// 通过基类初始化
const User = new (class extends MysqlCache<UserScheme> {
  constructor() {
    super(
      {
        name: 'User', // 表名，默认会转化为下划线(snackCase)形式，如 User->user UserPhoto->user_photo
        title: '用户表', // 表的备注名称
        scheme: userScheme, // 表的默认结构
        pick: ['userId', 'name'], // 查询列表时显示的字段信息
      },
      mysqlBin,
      redisCache,
    )
  }
})()

// const User1 = new (class extends MysqlCache<UserScheme> {
//   constructor() {
//     super(
//       {
//         name: 'User1', // 表名，默认会转化为下划线(snackCase)形式，如 User->user UserPhoto->user_photo
//         title: '用户表', // 表的备注名称
//         scheme: userScheme1, // 表的默认结构
//         pick: ['userId', 'name'], // 查询列表时显示的字段信息
//       },
//       mysqlBin,
//       redisCache,
//     )
//   }
// })()

// 批量插入
// await User.mInsert([
//   { name: '王小明', gender: 1 },
//   { name: '宋小华', gender: 1 },
// ])

// await User.updateById('id002', { name: '李四' }) // 返回 1
const a = async () => {
  await mysqlBin.safeTransaction(async (trx: CoaMysql.Transaction) => {
    await User.updateById('41102319990728253X', { name: 'mmm' }, trx)
    const q = await User.checkById('41102319990728253X', Object.keys(userScheme), trx)
    console.log(q);
    await $.timeout(3000)
    await User.updateById('1758003943672Y2', { name: 'heyifan2' }, trx)
  })
  const b = await User.checkById('41102319990728253X')
  console.log(b);
  // const id = await redisCache.clearUseless('*id')
  // console.log('cRedis: ID类型过期缓存清除成功', id)
  // const data = await redisCache.clearUseless('*data')
  // console.log('cRedis: DATA类型过期缓存清除成功', data)
}
a()
