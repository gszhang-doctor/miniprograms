# Excel导出云函数

## 功能说明

该云函数使用 ExcelJS 库在前端发送的数据基础上生成带样式的 Excel 文件，包括：
- 多个工作表（每个项目的车次、付款、欠账、汇总）
- 单元格合并
- 表头样式
- 边框和对齐设置

## 部署步骤

1. 在微信开发者工具中，右键点击 `cloudfunctions/exportExcel` 文件夹
2. 选择"上传并部署：云端安装依赖"
3. 等待部署完成

## 使用方法

在小程序中调用：

```javascript
wx.cloud.callFunction({
  name: 'exportExcel',
  data: {
    projects: projects,      // 项目列表
    trucks: trucks,          // 车次列表
    payments: payments,      // 付款列表
    debts: debts             // 欠账列表
  }
}).then(res => {
  if (res.result.errCode === 0) {
    const { fileData, fileName } = res.result.data;
    // 将base64数据保存为文件
    const fs = wx.getFileSystemManager();
    const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
    fs.writeFileSync(filePath, fileData, 'base64');

    // 打开文件
    wx.openDocument({
      filePath: filePath,
      fileType: 'xlsx',
      showMenu: true
    });
  }
});
```

## 依赖

- wx-server-sdk: ~2.4.0
- exceljs: ^4.3.0
