// 我的页面逻辑
const app = getApp();
const { showToast } = require('../../utils/util.js');

Page({
  data: {
    userName: '',
    isEditing: false
  },

  onLoad() {
    this.loadUserInfo();
  },

  onShow() {
    this.loadUserInfo();
  },

  onPullDownRefresh() {
    app.uploadToCloud(true).then(() => {
      return app.syncFromCloud(true);
    }).then(() => {
      this.loadUserInfo();
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

  loadUserInfo() {
    const userName = app.getUserName() || '';
    this.setData({ userName, isEditing: false });
  },

  // 开始编辑
  startEdit() {
    this.setData({ isEditing: true });
  },

  // 输入姓名
  inputName(e) {
    this.setData({ userName: e.detail.value.trim() });
  },

  // 取消编辑
  cancelEdit() {
    this.loadUserInfo();
  },

  // 保存姓名
  saveName() {
    const userName = this.data.userName.trim();
    
    if (!userName) {
      showToast('请输入姓名');
      return;
    }

    app.setUserName(userName);
    this.setData({ isEditing: false });
    showToast('保存成功');
  },

  // 查看项目统计
  viewProjectStats() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  // 查看分红统计
  viewBonusStats() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  // 清空数据
  clearData() {
    wx.showModal({
      title: '确认清空',
      content: '此操作将清空所有本地数据，确认继续？',
      confirmColor: '#FF4D4F',
      success: (res) => {
        if (res.confirm) {
          app.clearAllData();
          this.loadUserInfo();
          showToast('已清空数据');
        }
      }
    });
  }
});
