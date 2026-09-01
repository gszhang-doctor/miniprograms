// 车次列表页面逻辑
const app = getApp();
const { formatDate, showConfirm, showToast } = require('../../utils/util.js');

Page({
  data: {
    projectId: '',
    projectName: '',
    trucks: [],
    stats: null
  },

  onLoad(options) {
    const { projectId, projectName } = options;
    
    this.setData({
      projectId,
      projectName: decodeURIComponent(projectName)
    });

    this.loadTrucks();
  },

  onShow() {
    this.loadTrucks();
  },

  // 下拉刷新
  async onPullDownRefresh() {
    try {
      // 调用云同步
      await app.syncFromCloud(true);
      // 重新加载车次数据
      this.loadTrucks();
    } finally {
      wx.stopPullDownRefresh();
    }
  },

  // 加载车次列表
  loadTrucks() {
    const trucks = app.getTrucks(this.data.projectId);

    // 按时间倒序排列
    trucks.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));

    // 使用 app 的统计方法计算
    const stats = app.calculateProjectStats(this.data.projectId);

    this.setData({
      trucks,
      stats: {
        totalQuantity: stats.totalQuantity.toFixed(1),
        concreteAmount: stats.concreteAmount,
        pumpAmount: stats.pumpCost,
        totalAmount: stats.totalAmount.toFixed(2)
      }
    });
  },

  // 查看车次详情
  viewTruckDetail(e) {
    const truck = e.currentTarget.dataset.truck;
    const amount = (truck.quantity * truck.unitPrice).toFixed(2);
    // 显示车次详情弹窗
    wx.showModal({
      title: '车次详情',
      content: `车次编号：${truck.truckNo}\n司机：${truck.driverName}\n车牌：${truck.licensePlate}\n施工部位：${truck.constructionSite}\n强度等级：${truck.strengthGrade}\n单价：¥${truck.unitPrice}/方\n方数：${truck.quantity}方\n金额：¥${amount}`,
      showCancel: false
    });
  },

  // 添加车次
  addTruck() {
    wx.navigateTo({
      url: `/pages/truck-create/truck-create?projectId=${this.data.projectId}`
    });
  },

  // 删除车次
  deleteTruck(e) {
    const truckId = e.currentTarget.dataset.truckId;

    showConfirm('确定要删除这条车次记录吗？', '删除确认').then(confirm => {
      if (confirm) {
        app.deleteTruck(truckId);
        showToast('删除成功', 'success');
        this.loadTrucks();
      }
    });
  },

  // 编辑车次
  editTruck(e) {
    const truck = e.currentTarget.dataset.truck;
    wx.navigateTo({
      url: `/pages/truck-create/truck-create?projectId=${this.data.projectId}&truckId=${truck.truckId}`
    });
  }
});
