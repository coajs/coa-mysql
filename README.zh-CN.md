# coa-mysql

[![GitHub license](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](LICENSE)
[![npm version](https://img.shields.io/npm/v/coa-mysql.svg?style=flat-square)](https://www.npmjs.org/package/coa-mysql)
[![npm downloads](https://img.shields.io/npm/dm/coa-mysql.svg?style=flat-square)](http://npm-stat.com/charts.html?package=coa-mysql)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/coajs/coa-mysql/pulls)

[English](README.md) | 简体中文

MySQL 数据库组件 for coajs，包含基本数据模型、缓存数据模型、分布式 ID 等

## 特点

- **功能齐全**: 基础数据连接基于[mysql](https://github.com/mysqljs/mysql)，SQL 查询基于[knex](https://github.com/knex/knex)，注重性能，功能齐全包含原生库所有使用方式
- **简单轻量**: 不超过 1000 行代码，不依赖于其他第三方库
- **快捷方便**: 基本数据模型自带 CRUD 操作，无需额外代码
- **自动缓存**: 缓存数据模型能自动进行数据的缓存管理（缓存生成、缓存淘汰等逻辑），缓存基于[coa-redis](https://github.com/coajs/coa-redis)
- **TypeScript**: 全部使用 TypeScript 书写，类型约束、IDE 友好

## 组件

- 基本数据模型 `MysqlNative`: 自动实现基本的 CRUD 等操作
- 缓存数据模型 `MysqlCache`: 在基本数据模型上接管数据缓存逻辑
- 分布式 ID `MysqlUuid`: 超轻量的分布式 UUID

## 快速开始

### 安装

```shell
yarn add coa-mysql
```

### 实例配置

```typescript
import { MysqlBin } from 'coa-mysql'

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
    other: { database: 'other', ms: 7 * 24 * 3600 * 1000 },
  },
}

// 初始化Mysql基本连接，后续所有模型均依赖此实例
const mysqlBin = new MysqlBin(mysqlConfig)
```

### 基本 SQL 查询

新建用户表`user`，表结构如下

```shell
CREATE TABLE `user` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT COMMENT '自增长主键',
  `userId` varchar(32) NOT NULL DEFAULT '' COMMENT '用户ID',
  `name` varchar(64) NOT NULL DEFAULT '' COMMENT '姓名',
  `mobile` varchar(16) NOT NULL DEFAULT '' COMMENT '手机号',
  `avatar` varchar(256) NOT NULL DEFAULT '' COMMENT '头像',
  `gender` int(11) NOT NULL DEFAULT '0' COMMENT '性别，1男 2女',
  `language` varchar(16) NOT NULL DEFAULT '' COMMENT '语言',
  `status` int(1) NOT NULL DEFAULT '1' COMMENT '状态，1正常 2隐藏',
  `created` bigint(20) NOT NULL DEFAULT '0' COMMENT '创建时间',
  `updated` bigint(20) NOT NULL DEFAULT '0' COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `user_userid_unique` (`userId`) USING BTREE
) COMMENT='用户表';
```

对用户表进行 SQL 操作

```typescript
// 插入数据，详见 https://knexjs.org/#Builder-insert
mysqlBin.io.table('user').insert({ userId: 'user-a', name: 'A', mobile: '15010001001', gender: 1, language: 'zh-CN', status: 1 })

// 查询全部数据，详见 https://knexjs.org/#Builder-select
mysqlBin.io.table('user').select()
mysqlBin.io.select('*').from('user')

// 带条件查询，详见 https://knexjs.org/#Builder-where
mysqlBin.io.table('user').where('status', '=', 1)

// 修改数据，详见 http://knexjs.org/#Builder-update
mysqlBin.io.table('user').update({ name: 'AA', gender: 2 }).where({ userId: 'user-a' })

// 删除数据，详见 http://knexjs.org/#Builder-del%20/%20delete
mysqlBin.io.table('user').delete().where({ userId: 'user-a' })
```

其中`io`是一个`Knex`对象，可以支持 [Knex.js](http://knexjs.org/#Builder) 的**全部**用法

### 基本数据模型

在实际项目工程中，为了保证查询的高效、严谨，我们并不会直接操作 SQL 语句。基本的数据模块可以帮助我们实现 CURD 操作。 通过如下方式定义一个基本数据模型`User`

```typescript
import { MysqlBin, MysqlNative } from 'coa-mysql'

// 定义User的默认结构
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
const User = new (class extends MysqlNative<UserScheme> {
  constructor() {
    super(
      {
        name: 'User', // 表名，默认会转化为下划线(snackCase)形式，如 User->user UserPhoto->user_photo
        title: '用户表', // 表的备注名称
        scheme: userScheme, // 表的默认结构
        pick: ['userId', 'name'], // 查询列表时显示的字段信息
      },
      // 绑定配置实例bin
      mysqlBin
    )
  }

  // 自定义方法
  async customMethod() {
    // 做一些事情
  }
})()
```

通常一个数据表对应一个模型，定义模型后，我们直接操作模型就可以对表进行操作

```typescript
// 插入
await User.insert({ name: '王小明', gender: 1 }) // 返回 'id001'，即该条数据的 userId = 'id001'

// 批量插入
await User.mInsert([
  { name: '王小明', gender: 1 },
  { name: '宋小华', gender: 1 },
]) // 返回 ['id002','id003']

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
await User.truncate() // 无返回值，不报错就是操作成功

// 自定义方法
await User.customMethod() // 调用自定义方法
```

实际项目中，我们可能需要定义多个模型，每个模型上都有一些公共方法。这时，我们可以抽象一个基类模型，其他模型继承这个基类模型

```typescript
import { CoaMysql } from 'coa-mysql'

// 通过mysqlBin定义一个模型的基类，各个模型都可以使用这个基类
export class MysqlNativeModel<T> extends MysqlNative<T> {
  constructor(option: CoaMysql.ModelOption<T>) {
    // 将实例配置bin绑定
    super(option, mysqlBin)
  }

  // 也可以定义一些通用方法
  commonMethod() {
    // do something
  }
}

// 通过基类模型定义用户模型
const User = new (class extends MysqlNativeModel<UserScheme> {
  constructor() {
    super({ name: 'User', title: '用户表', scheme: userScheme, pick: ['userId', 'name'] })
  }

  // 自定义方法
  async customMethodForUser() {
    // 做一些事情
  }
})()

// 通过基类模型定义管理员模型
const Manager = new (class extends MysqlNativeModel<ManagerScheme> {
  constructor() {
    super({ name: 'Manager', title: '管理员表', scheme: managerScheme, pick: ['userId', 'name'] })
  }
})()

// 用户模型和管理员模型均可以调用公共方法
await User.commonMethod()
await Manager.commonMethod()

// 仅仅用户模型可以调用自定义方法
await User.customMethodForUser()
```

### 缓存数据模型

基于 [coa-redis](https://www.npmjs.com/package/coa-redis) 实现快速高效的数据缓存逻辑，并**统一对缓存进行管理、维护缓存的生命周期、保证缓存与 MySQL 数据的一致性**

使用之前需安装 `coa-redis` ，使用方法可查看 [这里](https://github.com/coajs/coa-redis)

缓存数据模型的使用方法和基本数据模型完全相同，仅需要将 `MysqlNative` 替换为 `MysqlCache`

```typescript
import { CoaMysql, MysqlCache } from 'coa-mysql'
import { RedisBin, RedisCache } from 'coa-redis'

// 定义一个redis实例，详细用法详见 https://github.com/coajs/coa-redis
const redisCache = new RedisCache(new RedisBin({ host: '127.0.0.1' }))

// 定义一个缓存数据模型的基类
export class MysqlCacheModel<T> extends MysqlCache<T> {
  constructor(option: CoaMysql.ModelOption<T>) {
    // 将配置实例 和 redisCache实例 都绑定到这个基类上
    super(option, mysqlBin, redisCache)
  }
}

// 通过缓存基类模型定义缓存用户模型
const UserCached = new (class extends MysqlCacheModel<UserScheme> {
  constructor() {
    super({ name: 'User', title: '用户表', scheme: userScheme, pick: ['userId', 'name'] })
  }
})()

// 查询数据
await User.getById('id001') // 首次查询会先读取数据库
await User.getById('id001') // 第二次调用会直接从缓存中读取数据

// 增删改操作和基本数据模型一致
await User.insert({ name: '王小明', gender: 1 }) // 返回 'id001'
await User.updateById('id001', { name: '李四' }) // 返回 1
```

缓存模型会自动维护和管理缓存，如果缓存已经存在，接下来又调用 `update` 更新了数据，再次查询数据时自动从数据库中取出最新的数据。 实现原理可点击 这里(todo) 了解更多
