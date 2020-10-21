import { $ } from 'coa-helper'

const MemoryLockData = {} as { [name: string]: boolean }

class MemoryLock {
  private readonly key: string

  constructor (key: string) {
    this.key = key
  }

  async lock () {
    if (MemoryLockData[this.key]) {
      return false
    } else {
      MemoryLockData[this.key] = true
      return true
    }
  }

  async unlock () {
    delete MemoryLockData[this.key]
  }
}

export default new class {

  async start<T> (id: string, worker: () => Promise<T>, interval = 10) {

    const memoryLock = new MemoryLock(id)

    // 阻塞等待
    while (!await memoryLock.lock()) {
      await $.timeout(interval)
    }

    // 执行操作，无论是否成功均释放锁
    return await worker().finally(() => {
      memoryLock.unlock().then()
    })
  }

}
