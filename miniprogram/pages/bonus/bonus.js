// 分红页面逻辑
const app = getApp();
const { formatDate, showToast } = require('../../utils/util.js');

Page({
  data: {
    projects: [],
    bonusRecords: {},
    loading: false
  },

  onLoad() {
    this.loadProjects();
  },

  onShow() {
    this.loadProjects();
  },

  onPullDownRefresh() {
    app.uploadToCloud(true).then(() => {
      return app.syncFromCloud(true);
    }).then(() => {
      this.loadProjects();
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

  loadProjects() {
    let projects = app.getProjects();
    
    // 按创建日期倒序排序
    projects.sort((a, b) => {
      const dateA = a.createDate || '';
      const dateB = b.createDate || '';
      const dateCompare = dateB.localeCompare(dateA);
      if (dateCompare !== 0) return dateCompare;

      const timeA = a.createTime || '';
      const timeB = b.createTime || '';
      const timeDateA = new Date(timeA);
      const timeDateB = new Date(timeB);
      return timeDateB - timeDateA;
    });

    // 加载分红记录
    const bonusRecords = app.getBonusRecords();

    // 计算每个项目的工头和司机支付状态
    const projectsWithStatus = projects.map(project => {
      const records = bonusRecords[project.projectId] || [];
      const foremanRecords = records.filter(r => r.type === 'foreman');

      // 工头支付状态
      let foremanStatus = null;
      if (foremanRecords.length > 0) {
        // 只要有未支付的记录，就显示未支付
        const hasUnpaid = foremanRecords.some(r => !r.paid);
        foremanStatus = hasUnpaid ? '未支付' : '已支付';
      }

      return {
        ...project,
        foremanStatus
      };
    });

    this.setData({
      projects: projectsWithStatus,
      bonusRecords
    });
  },

  // 获取项目的分红记录数量
  getBonusCount(projectId) {
    const records = this.data.bonusRecords[projectId] || [];
    const foremanRecords = records.filter(r => r.type === 'foreman');
    return foremanRecords.length;
  },

  // 获取项目的分红总额
  getBonusAmount(projectId) {
    const records = this.data.bonusRecords[projectId] || [];
    const foremanRecords = records.filter(r => r.type === 'foreman');
    return foremanRecords.reduce((sum, record) => sum + (parseFloat(record.amount) || 0), 0).toFixed(2);
  },

  // 点击工头
  goToForemanBonus(e) {
    const projectId = e.currentTarget.dataset.projectId;
    const project = this.data.projects.find(p => p.projectId === projectId);
    wx.navigateTo({
      url: `/pages/bonus-foreman/bonus-foreman?projectId=${projectId}&projectName=${encodeURIComponent(project.projectName)}&foreman=${encodeURIComponent(project.foreman)}`
    });
  },

  // 点击司机
  goToDriverBonus(e) {
    const projectId = e.currentTarget.dataset.projectId;
    const project = this.data.projects.find(p => p.projectId === projectId);
    wx.navigateTo({
      url: `/pages/bonus-driver/bonus-driver?projectId=${projectId}&projectName=${encodeURIComponent(project.projectName)}`
    });
  }
});
