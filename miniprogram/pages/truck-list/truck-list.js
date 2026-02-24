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

  // 加载车次列表
  loadTrucks() {
    const trucks = app.getTrucks(this.data.projectId);
    
    // 按时间倒序排列
    trucks.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));

    // 计算统计数据
    const stats = this.calculateStats(trucks);

    this.setData({
      trucks,
      stats
    });
  },

  // 计算统计数据
  calculateStats(trucks) {
    let totalQuantity = 0;
    let totalAmount = 0;
    let concreteAmount = 0;
    let pumpAmount = 0;

    trucks.forEach(truck => {
      totalQuantity += truck.quantity;
      // 计算每条车次的总金额（混凝土+泵车）
      const truckConcreteAmount = truck.quantity * truck.unitPrice;
      const truckPumpCost = truck.pumpCost || 0;
      const total = truckConcreteAmount + truckPumpCost;
      truck.amount = total.toFixed(2);
      truck.concreteAmount = truckConcreteAmount.toFixed(2);
      totalAmount += total;
      concreteAmount += truckConcreteAmount;
      pumpAmount += truckPumpCost;
    });

    return {
      totalQuantity: totalQuantity.toFixed(1),
      concreteAmount: concreteAmount.toFixed(2),
      pumpAmount: pumpAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2)
    };
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
