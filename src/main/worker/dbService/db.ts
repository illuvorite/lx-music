import Database from 'better-sqlite3'
import path from 'path'
import tables, { DB_VERSION } from './tables'
import verifyDB from './verifyDB'
import migrateData from './migrate'

// 使用 process 共享 db 句柄。
// webpack 5 worker 模式下，db.ts 会被编译成多个 module 实例（每个 chunk 一份），
// 每个实例都有自己的 const g = globalThis 闭包，写 g.__lx_db 写不到真正的 globalThis。
// Node 的 process 对象是真正的进程级单例，所有 V8 context、所有模块都共享同一对象。
interface LXDBProcess {
  __lx_db?: Database.Database
}
function getStore(): LXDBProcess {
  return process as unknown as LXDBProcess
}

const initTables = (db: Database.Database) => {
  db.exec(`
    ${Array.from(tables.values()).join('\n')}
    INSERT INTO "main"."db_info" ("field_name", "field_value") VALUES ('version', '${DB_VERSION}');
  `)
}


// 打开、初始化数据库
export const init = (lxDataPath: string): boolean | null => {
  if (getStore().__lx_db) {
    // 已被初始化过
    return true
  }
  const databasePath = path.join(lxDataPath, 'lx.data.db')
  const nativeBinding = path.join(__dirname, '../node_modules/better-sqlite3/build/Release/better_sqlite3.node')
  let dbFileExists = true

  let db: Database.Database
  try {
    db = new Database(databasePath, {
      fileMustExist: true,
      nativeBinding,
      // verbose: process.env.NODE_ENV !== 'production' ? console.log : undefined,
    })
  } catch (error) {
    console.log(error)
    db = new Database(databasePath, {
      nativeBinding,
      // verbose: process.env.NODE_ENV !== 'production' ? console.log : undefined,
    })
    initTables(db)
    dbFileExists = false
  }
  db.pragma('journal_mode = WAL')

  if (dbFileExists) migrateData(db)

  // https://www.sqlite.org/pragma.html#pragma_optimize
  if (dbFileExists) db.exec('PRAGMA optimize;')
  if (!verifyDB(db)) {
    db.close()
    return null
  }

  // https://www.sqlite.org/lang/vacuum.html
  // db.exec('VACUUM "main"')

  process.on('exit', () => {
    try { db.close() } catch {}
  })
  getStore().__lx_db = db
  console.log('db inited, pid:', process.pid)
  // require('./test')
  return dbFileExists
}

// 获取数据库实例
export const getDB = (): Database.Database => {
  const db = getStore().__lx_db
  if (!db) {
    throw new Error('db not initialized; call init() first')
  }
  return db
}
