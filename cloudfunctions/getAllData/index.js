// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  const { collectionName } = event

  try {
    // 直接使用分页查询获取所有数据（真正无限制）
    console.log(`开始获取 ${collectionName} 数据...`)
    const allData = []
    const BATCH_SIZE = 100
    let hasMore = true
    let skip = 0

    while (hasMore) {
      const res = await db.collection(collectionName)
        .skip(skip)
        .limit(BATCH_SIZE)
        .get()

      if (res.data && res.data.length > 0) {
        allData.push(...res.data)
        console.log(`已获取 ${allData.length} 条记录...`)

        if (res.data.length < BATCH_SIZE) {
          hasMore = false
        } else {
          skip += BATCH_SIZE
        }
      } else {
        hasMore = false
      }
    }

    console.log(`最终获取 ${allData.length} 条 ${collectionName} 记录`)

    return {
      success: true,
      data: allData,
      message: `获取 ${collectionName} 数据成功（共 ${allData.length} 条）`
    }
  } catch (error) {
    console.error('获取数据失败:', error)
    return {
      success: false,
      error: error.message,
      message: `获取 ${collectionName} 数据失败`
    }
  }
}
