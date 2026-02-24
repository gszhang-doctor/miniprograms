// 司机分红详情页面逻辑
const app = getApp();
const { formatDate, showToast } = require('../../utils/util.js');

Page({
  data: {
    projectId: '',
    projectName: '',
    driver: '',
    records: [],
    summary: {
      count: 0,
      totalQuantity: 0,
      totalAmount: 0
    }
  },

  onLoad(options) {
    const { projectId, projectName, driver } = options;
    this.setData({
      projectId: decodeURIComponent(projectId),
      projectName: decodeURIComponent(projectName),
      driver: decodeURIComponent(driver)
    });
    this.loadRecords();
  },

  onShow() {
    this.loadRecords();
  },

  onPullDownRefresh() {
    app.uploadToCloud(true).then(() => {
      return app.syncFromCloud(true);
    }).then(() => {
      this.loadRecords();
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

  loadRecords() {
    const trucks = app.getTrucks(this.data.projectId) || [];
    const driverRecords = trucks.filter(t => t.driver === this.data.driver);

    const summary = {
      count: driverRecords.length,
      totalQuantity: 0,
      totalAmount: 0
    };

    driverRecords.forEach(record => {
      summary.totalQuantity += parseFloat(record.quantity) || 0;
      summary.totalAmount += parseFloat(record.totalPrice) || 0;
    });

    this.setData({
      records: driverRecords,
      summary: {
        count: summary.count,
        totalQuantity: summary.totalQuantity.toFixed(1),
        totalAmount: summary.totalAmount.toFixed(2)
      }
    });
  }
});
