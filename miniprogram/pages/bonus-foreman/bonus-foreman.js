// 工头分红页面逻辑
const app = getApp();
const { formatDate, showToast } = require('../../utils/util.js');

Page({
  data: {
    projectId: '',
    projectName: '',
    foreman: '',
    records: []
  },

  onLoad(options) {
    const { projectId, projectName, foreman } = options;
    this.setData({
      projectId: decodeURIComponent(projectId),
      projectName: decodeURIComponent(projectName),
      foreman: decodeURIComponent(foreman)
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
    const bonusRecords = app.getBonusRecords();
    const records = bonusRecords[this.data.projectId] || [];
    this.setData({ records });
  },

  // 新建分红记录
  createBonusRecord() {
    wx.navigateTo({
      url: `/pages/bonus-foreman-create/bonus-foreman-create?projectId=${encodeURIComponent(this.data.projectId)}&projectName=${encodeURIComponent(this.data.projectName)}&foreman=${encodeURIComponent(this.data.foreman)}`
    });
  },

  // 查看记录详情
  viewRecord(e) {
    const index = e.currentTarget.dataset.index;
    const record = this.data.records[index];
    const amountText = record.amount ? `${record.amount}元` : '未填写';
    wx.showModal({
      title: '分红详情',
      content: `项目：${this.data.projectName}\n工头：${this.data.foreman}\n金额：${amountText}\n状态：${record.paid ? '已支付' : '未支付'}\n创建者：${record.creator || '未知'}`,
      showCancel: false
    });
  },

  // 删除记录
  deleteRecord(e) {
    const index = e.currentTarget.dataset.index;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条分红记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.deleteRecordConfirm(index);
        }
      }
    });
  },

  deleteRecordConfirm(index) {
    app.deleteBonusRecord(this.data.projectId, index);
    this.loadRecords();
    showToast('删除成功');
  }
});
