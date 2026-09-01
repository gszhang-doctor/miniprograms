# 云数据库配置说明

## 数据库集合

需要创建以下4个数据库集合：

### 1. projects（项目集合）
```json
{
  "_id": "项目ID",
  "projectId": "项目ID",
  "projectName": "项目名称",
  "foreman": "工头姓名",
  "foremanPhone": "工头电话",
  "createDate": "创建日期",
  "createTime": "创建时间",
  "remarks": "备注",
  "totalTrucks": "车次数量",
  "updateTime": "更新时间"
}
```

### 2. trucks（车次集合）
```json
{
  "_id": "车次ID",
  "truckId": "车次ID",
  "projectId": "所属项目ID",
  "truckNo": "车次编号",
  "driverName": "司机姓名",
  "licensePlate": "车牌号码",
  "constructionSite": "施工部位",
  "strengthGrade": "强度等级",
  "unitPrice": "单价",
  "quantity": "方数",
  "pumpDriver": "泵车司机",
  "pumpCost": "泵车费用",
  "remarks": "备注",
  "createTime": "创建时间",
  "updateTime": "更新时间"
}
```

### 3. payments（付款记录集合）
```json
{
  "_id": "付款ID",
  "paymentId": "付款ID",
  "projectId": "所属项目ID",
  "paymentDate": "付款日期",
  "paymentMethod": "付款方式",
  "amount": "付款金额",
  "remarks": "备注",
  "images": "凭证图片",
  "createTime": "创建时间",
  "updateTime": "更新时间"
}
```

### 4. debts（欠账记录集合）
```json
{
  "_id": "欠账ID",
  "debtId": "欠账ID",
  "projectId": "所属项目ID",
  "debtorName": "欠款人姓名",
  "debtorPhone": "欠款人电话",
  "debtAmount": "欠款金额",
  "dueDate": "约定结清时间",
  "responsiblePerson": "站内负责人",
  "isSettled": "是否已结清",
  "settledDate": "结清时间",
  "createTime": "创建时间",
  "updateTime": "更新时间"
}
```

## 数据库权限规则

### database.rules.json

如果需要多用户协作共享数据，使用以下权限规则（所有用户可读写）：

```json
{
  "projects": {
    "read": true,
    "write": true
  },
  "trucks": {
    "read": true,
    "write": true
  },
  "payments": {
    "read": true,
    "write": true
  },
  "debts": {
    "read": true,
    "write": true
  },
  "bonusRecords": {
    "read": true,
    "write": true
  },
  "userInfo": {
    "read": true,
    "write": true
  }
}
```

如果需要按创建者权限（仅创建者可读写），使用以下权限规则：

```json
{
  "projects": {
    "read": "auth.openid == doc.openid",
    "write": "auth.openid == doc.openid"
  },
  "trucks": {
    "read": "auth.openid == doc.openid",
    "write": "auth.openid == doc.openid"
  },
  "payments": {
    "read": "auth.openid == doc.openid",
    "write": "auth.openid == doc.openid"
  },
  "debts": {
    "read": "auth.openid == doc.openid",
    "write": "auth.openid == doc.openid"
  }
}
```

## 使用说明

1. 在微信开发者工具中，点击【云开发】按钮
2. 开通云开发服务（如未开通）
3. 创建或选择已有的云开发环境
4. 复制环境ID，替换 `app.js` 中的 `your-env-id`
5. 在云开发控制台创建数据库集合：projects, trucks, payments, debts, bonusRecords, userInfo
6. **重要：设置数据库权限规则**
   - 如果需要多用户协作共享数据（推荐）：设置为"所有用户可读写"
   - 如果需要数据隔离：设置为"仅创建者可读写"
7. 重新编译小程序，即可使用云上传和云下载功能

## 注意事项

- 请确保小程序已开通云开发功能
- 数据库权限规则需要设置为仅创建者可读写
- 建议在正式环境使用前在测试环境充分测试
- 上传和下载操作会完全覆盖本地或云端数据，请谨慎操作
