// 司机分红页面逻辑
const app = getApp();
const { formatDate, showToast } = require('../../utils/util.js');

Page({
  data: {
    projectId: '',
    projectName: '',
    trucks: []
  },

  onLoad(options) {
    const { projectId, projectName } = options;
    this.setData({
      projectId: decodeURIComponent(projectId),
      projectName: decodeURIComponent(projectName)
    });
    this.loadTrucks();
  },

  onShow() {
    this.loadTrucks();
  },

  onPullDownRefresh() {
    app.uploadToCloud(true).then(() => {
      return app.syncFromCloud(true);
    }).then(() => {
      this.loadTrucks();
      wx.stopPullDownRefresh();
      wx.showToast({
        title: '同步成功',
        icon: 'success'
      });
    }).catch(err => {
      console.error('同步失败:', err);
      wx.stopPullDownRefresh();
      wx.showToast({
        title: '同步失败',
        icon: 'none'
      });
    });
  },

  loadTrucks() {
    const trucks = app.getTrucks(this.data.projectId) || [];
    
    // 按司机分组统计
    const driverStats = {};
    trucks.forEach(truck => {
      const driver = truck.driver || '未知';
      if (!driverStats[driver]) {
        driverStats[driver] = {
          driver,
          count: 0,
          totalQuantity: 0,
          totalAmount: 0
        };
      }
      driverStats[driver].count++;
      driverStats[driver].totalQuantity += parseFloat(truck.quantity) || 0;
      driverStats[driver].totalAmount += parseFloat(truck.totalPrice) || 0;
    });

    const driverList = Object.values(driverStats).map(item => ({
      ...item,
      totalQuantity: item.totalQuantity.toFixed(1),
      totalAmount: item.totalAmount.toFixed(2)
    }));

    this.setData({ trucks: driverList });
  },

  // 查看司机详情
  viewDriverDetail(e) {
    const driver = e.currentTarget.dataset.driver;
    wx.navigateTo({
      url: `/pages/bonus-driver-detail/bonus-driver-detail?projectId=${encodeURIComponent(this.data.projectId)}&projectName=${encodeURIComponent(this.data.projectName)}&driver=${encodeURIComponent(driver)}`
    });
  }
});
