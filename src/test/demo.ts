// @ts-nocheck
import { CoaMysql, MysqlBin, MysqlNative } from '..'

// MySQL配置
const mysqlConfig = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 'root',
  charset: 'utf8mb4',
  trace: true,
  debug: false,
  databases: {
    main: { database: 'test', ms: 7 * 24 * 3600 * 1000 },
    other: { database: 'other', ms: 7 * 24 * 3600 * 1000 }
  }
}

// 初始化Mysql基本连接，后续所有模型均依赖此实例
const mysqlBin = new MysqlBin(mysqlConfig)

// 基本SQL操作

// 插入数据 https://knexjs.org/#Builder-insert
await mysqlBin.io.table('user').insert({ userId: 'user-a', name: 'A', mobile: '15010001001', gender: 1, language: 'zh-CN', status: 1 })

// 查询全部数据，详见 https://knexjs.org/#Builder-select
await mysqlBin.io.table('user').select()
await mysqlBin.io.select('*').from('user')

// 带条件查询，详见 https://knexjs.org/#Builder-where
await mysqlBin.io.table('user').where('status', '=', 1)

// 修改数据，详见 http://knexjs.org/#Builder-update
await mysqlBin.io.table('user').update({ name: 'AA', gender: 2 }).where({ userId: 'user-a' })

// 删除数据，详见 http://knexjs.org/#Builder-del%20/%20delete
await mysqlBin.io.table('user').delete().where({ userId: 'user-a' })

// 通过mysqlBin定义一个模型的基类，各个模型都可以使用这个基类
export class MysqlNativeModel<T> extends MysqlNative<T> {

  constructor (option: CoaMysql.ModelOption<T>) {
    // 将实例配置bin绑定
    super(option, mysqlBin)
  }

  // 也可以定义一些通用方法
  commonMethod () {
    // do something
  }
}

// 定义User默认结构
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
// 定义User类型（通过默认结构自动生成）
type UserScheme = typeof userScheme

// 通过基类初始化
const User = new class extends MysqlNative<UserScheme> {
  constructor () {
    super({
      name: 'User', // 表名，默认会转化为下划线(snackCase)形式，如 User->user UserPhoto->user_photo
      title: '用户表', // 表的备注名称
      scheme: userScheme, // 表的默认结构
      pick: ['userId', 'name'] // 查询列表时显示的字段信息
    }, mysqlBin) // 绑定配置实例bin
  }

  // 自定义方法
  async customMethod () {
    // 做一些事情
  }
}

// 通过基类模型定义用户模型
const User = new class extends MysqlNativeModel<UserScheme> {
  constructor () {
    super({ name: 'User', title: '用户表', scheme: userScheme, pick: ['userId', 'name'] })
  }

  // 自定义方法
  async customMethodForUser () {
    // 做一些事情
  }
}

// 通过基类模型定义管理员模型
const Manager = new class extends MysqlNativeModel<UserScheme> {
  constructor () {
    super({ name: 'Manager', title: '管理员表', scheme: userScheme, pick: ['userId', 'name'] })
  }
}

// 用户模型和管理员模型均可以调用公共方法
await User.commonMethod()
await Manager.commonMethod()

// 仅仅用户模型可以调用自定义方法
await User.customMethodForUser()

// 插入
await User.insert({ name: '王小明', gender: 1 }) // 返回 'id001'，即该条数据的 userId = 'id001'

// 批量插入
await User.mInsert([{ name: '王小明', gender: 1 }, { name: '宋小华', gender: 1 }]) // 返回 ['id002','id003']

// 通过ID更新
await User.updateById('id002', { name: '李四' }) // 返回 1

// 通过ID批量更新
await User.updateByIds(['id002', 'id003'], { status: 2 }) // 返回 2

// 通过ID更新或插入(如果id存在就更新，如果不存在就插入)
await User.upsertById('id002', { name: '王小明', gender: 1 }) // 返回 1 ，更新了一条 userId = 'id02' 的数据
await User.upsertById('id004', { name: '李四', gender: 1 }) // 返回 0 ，插入一条新数据，数据的 userId = 'id04'

// 通过ID删除多个
await User.deleteByIds(['id003', 'id004']) // 返回 2

// 通过ID查询一个，第二个参数设置返回结果所包含的数据
await User.getById('id001', ['name']) // 数据为{userId:'id001',name:'王小明',gender:1,status:1,...} 实际返回 {userId:'id001',name:'王小明'}

// 通过ID获取多个
await User.mGetByIds(['id001', 'id002'], ['name']) //返回 {id001:{userId:'id001',name:'王小明'},id002:{userId:'id002',name:'李四'}}

// 截断表
await User.truncate() // 无返回值，主要不报错即成功截断整个表

// 自定义方法
await User.customMethod() // 执行自定义方法