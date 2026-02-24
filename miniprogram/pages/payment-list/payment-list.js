// 付款列表页面逻辑
const app = getApp();
const { formatDate, showConfirm, showToast } = require('../../utils/util.js');

Page({
  data: {
    projectId: '',
    payments: [],
    stats: null
  },

  onLoad(options) {
    const { projectId } = options;
    
    this.setData({
      projectId
    });

    this.loadPayments();
  },

  onShow() {
    this.loadPayments();
  },

  // 加载付款记录
  loadPayments() {
    const payments = app.getPayments(this.data.projectId);
    
    // 按时间倒序排列
    payments.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));

    // 计算统计数据
    const stats = this.calculateStats(payments);

    this.setData({
      payments,
      stats
    });
  },

  // 计算统计数据
  calculateStats(payments) {
    // 获取项目总金额（混凝土费用+泵车费用）
    const trucks = app.getTrucks(this.data.projectId);
    let totalAmount = 0;
    trucks.forEach(truck => {
      const concreteCost = truck.unitPrice * truck.quantity;
      const pumpCost = truck.pumpCost || 0;
      totalAmount += concreteCost + pumpCost;
    });

    // 计算已付款金额
    let paidAmount = 0;
    payments.forEach(payment => {
      paidAmount += payment.amount;
    });

    const unpaidAmount = totalAmount - paidAmount;
    const progress = totalAmount > 0 ? ((paidAmount / totalAmount) * 100).toFixed(1) : 0;

    return {
      totalAmount: totalAmount.toFixed(2),
      paidAmount: paidAmount.toFixed(2),
      unpaidAmount: unpaidAmount.toFixed(2),
      progress
    };
  },

  // 获取付款方式图标
  getMethodIcon(method) {
    const icons = {
      '现金': '💵',
      '微信': '💬',
      '支付宝': '💳',
      '银行转账': '🏦'
    };
    return icons[method] || '💰';
  },

  // 预览图片
  previewImage(e) {
    const images = e.currentTarget.dataset.images;
    const current = e.currentTarget.dataset.current;
    wx.previewImage({
      current,
      urls: images
    });
  },

  // 添加付款
  addPayment() {
    wx.navigateTo({
      url: `/pages/payment-create/payment-create?projectId=${this.data.projectId}`
    });
  },

  // 添加欠账
  addDebt() {
    wx.navigateTo({
      url: `/pages/debt-create/debt-create?projectId=${this.data.projectId}`
    });
  },

  // 删除付款
  deletePayment(e) {
    const paymentId = e.currentTarget.dataset.paymentId;

    showConfirm('确定要删除这条付款记录吗？', '删除确认').then(confirm => {
      if (confirm) {
        app.deletePayment(paymentId);
        showToast('删除成功', 'success');
        this.loadPayments();
      }
    });
  }
});
