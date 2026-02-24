// 工头分红创建页面逻辑
const app = getApp();
const { formatDate, showToast } = require('../../utils/util.js');

Page({
  data: {
    projectId: '',
    projectName: '',
    foreman: '',
    amount: '',
    paid: false,
    creator: ''
  },

  onLoad(options) {
    const { projectId, projectName, foreman } = options;
    const creator = app.getUserName() || '';
    this.setData({
      projectId: decodeURIComponent(projectId),
      projectName: decodeURIComponent(projectName),
      foreman: decodeURIComponent(foreman),
      creator
    });

    if (!creator) {
      wx.showModal({
        title: '提示',
        content: '请先在"我的"页面设置姓名',
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/mine/mine'
          });
        }
      });
    }
  },

  // 输入金额
  inputAmount(e) {
    let value = e.detail.value;
    // 限制最多两位小数
    if (value.includes('.')) {
      const parts = value.split('.');
      if (parts[1] && parts[1].length > 2) {
        value = parts[0] + '.' + parts[1].substring(0, 2);
      }
    }
    this.setData({ amount: value });
  },

  // 切换支付状态
  togglePaid(e) {
    const paid = e.currentTarget.dataset.value === 'true';
    this.setData({ paid });
  },

  // 预览
  preview() {
    const amountText = this.data.amount ? `${this.data.amount}元` : '未填写';
    const content = `项目名称：${this.data.projectName}\n工头：${this.data.foreman}\n金额：${amountText}\n状态：${this.data.paid ? '已支付' : '未支付'}\n创建者：${this.data.creator}`;

    wx.showModal({
      title: '分红预览',
      content,
      showCancel: true,
      cancelText: '返回',
      confirmText: '确认保存',
      success: (res) => {
        if (res.confirm) {
          this.save();
        }
      }
    });
  },

  // 保存
  save() {
    if (!this.data.creator) {
      showToast('请先在"我的"页面设置姓名');
      return;
    }

    const record = {
      type: 'foreman',
      projectName: this.data.projectName,
      foreman: this.data.foreman,
      amount: this.data.amount || '',
      paid: this.data.paid,
      creator: this.data.creator,
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString()
    };

    app.addBonusRecord(this.data.projectId, record);

    showToast('保存成功');
    setTimeout(() => {
      wx.navigateBack();
    }, 1000);
  }
});
