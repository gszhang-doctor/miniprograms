// 欠账列表页面逻辑
const app = getApp();
const { showConfirm, showToast } = require('../../utils/util.js');

Page({
  data: {
    projectId: '',
    debts: [],
    stats: null
  },

  onLoad(options) {
    const { projectId } = options;

    this.setData({
      projectId
    });

    this.loadDebts();
  },

  onShow() {
    this.loadDebts();
  },

  // 下拉刷新
  async onPullDownRefresh() {
    try {
      await app.syncFromCloud(true);
      this.loadDebts();
    } finally {
      wx.stopPullDownRefresh();
    }
  },

  // 加载欠账记录
  loadDebts() {
    const debts = app.getDebts(this.data.projectId);

    // 按时间倒序排列
    debts.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));

    // 计算统计数据
    const stats = this.calculateStats(debts);

    this.setData({
      debts,
      stats
    });
  },

  // 计算统计数据
  calculateStats(debts) {
    let totalDebt = 0;
    let settledDebt = 0;
    let unsettledDebt = 0;

    debts.forEach(debt => {
      totalDebt += debt.amount;
      if (debt.isSettled) {
        settledDebt += debt.amount;
      } else {
        unsettledDebt += debt.amount;
      }
    });

    return {
      totalDebt: totalDebt.toFixed(2),
      settledDebt: settledDebt.toFixed(2),
      unsettledDebt: unsettledDebt.toFixed(2),
      totalCount: debts.length
    };
  },

  // 标记结清
  settleDebt(e) {
    const debtId = e.currentTarget.dataset.debtId;

    showConfirm('确定要标记这条欠账为已结清吗？', '确认结清').then(confirm => {
      if (confirm) {
        app.settleDebt(debtId);
        showToast('已标记为结清', 'success');
        this.loadDebts();
      }
    });
  },

  // 删除欠账
  deleteDebt(e) {
    const debtId = e.currentTarget.dataset.debtId;

    showConfirm('确定要删除这条欠账记录吗？', '删除确认').then(confirm => {
      if (confirm) {
        app.deleteDebt(debtId);
        showToast('删除成功', 'success');
        this.loadDebts();
      }
    });
  },

  // 添加欠账
  addDebt() {
    wx.navigateTo({
      url: `/pages/debt-create/debt-create?projectId=${this.data.projectId}`
    });
  },

  // 拨打欠账人电话
  callDebtor(e) {
    const phone = e.currentTarget.dataset.phone;
    const name = e.currentTarget.dataset.name;

    if (!phone) {
      showToast('暂无电话号码');
      return;
    }

    wx.showModal({
      title: '拨打电话',
      content: `确定要拨打 ${name} (${phone}) 吗？`,
      success(res) {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: phone,
            fail: () => {
              showToast('拨打电话失败');
            }
          });
        }
      }
    });
  }
});
