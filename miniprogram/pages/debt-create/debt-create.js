// 新增欠账页面逻辑
const app = getApp();
const { formatDate, validateRequired, showToast } = require('../../utils/util.js');

Page({
  data: {
    projectId: '',
    name: '',
    phone: '',
    amount: '',
    debtDate: '',
    settleDate: '',
    settleDateType: '',
    manager: '',
    remarks: '',
    minDate: '',
    maxDate: ''
  },

  onLoad(options) {
    const { projectId } = options;

    // 设置默认日期为今天
    const today = formatDate(new Date());

    // 设置日期范围（过去30天到未来365天）
    const minDate = formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const maxDate = formatDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));

    this.setData({
      projectId,
      debtDate: today,
      minDate,
      maxDate
    });
  },

  // 欠账人姓名输入
  onNameInput(e) {
    this.setData({ name: e.detail.value });
  },

  // 联系电话输入
  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
  },

  // 欠账金额输入
  onAmountInput(e) {
    this.setData({ amount: e.detail.value });
  },

  // 欠账日期选择
  onDebtDateChange(e) {
    this.setData({ debtDate: e.detail.value });
  },

  // 快捷选择：下次结清
  selectQuickSettle() {
    this.setData({
      settleDate: '下次结清',
      settleDateType: 'quick'
    });
  },

  // 快捷选择：一周内
  selectWeekSettle() {
    const weekDate = formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    this.setData({
      settleDate: weekDate,
      settleDateType: 'week'
    });
  },

  // 快捷选择：一个月内
  selectMonthSettle() {
    const monthDate = formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    this.setData({
      settleDate: monthDate,
      settleDateType: 'month'
    });
  },

  // 结清期限选择
  onSettleDateChange(e) {
    this.setData({
      settleDate: e.detail.value,
      settleDateType: 'date'
    });
  },

  // 站内负责人输入
  onManagerInput(e) {
    this.setData({ manager: e.detail.value });
  },

  // 备注输入
  onRemarksInput(e) {
    this.setData({ remarks: e.detail.value });
  },

  // 取消
  onCancel() {
    wx.navigateBack();
  },

  // 确认提交
  onConfirm() {
    // 验证必填项
    if (!validateRequired(this.data.name, '欠账人姓名')) return;
    if (!validateRequired(this.data.phone, '联系电话')) return;
    if (!validateRequired(this.data.amount, '欠账金额')) return;
    if (!validateRequired(this.data.debtDate, '欠账日期')) return;

    // 验证电话号码格式
    const phoneReg = /^1[3-9]\d{9}$/;
    if (!phoneReg.test(this.data.phone)) {
      showToast('请输入正确的手机号码');
      return;
    }

    // 验证金额格式
    const amount = parseFloat(this.data.amount);
    if (isNaN(amount) || amount <= 0) {
      showToast('请输入有效的欠账金额');
      return;
    }

    // 创建欠账记录
    const debt = {
      debtId: app.generateId('debt'),
      projectId: this.data.projectId,
      name: this.data.name,
      phone: this.data.phone,
      amount: amount,
      debtDate: this.data.debtDate,
      settleDate: this.data.settleDate || '',
      manager: this.data.manager || '',
      remarks: this.data.remarks || '',
      isSettled: false,
      createTime: formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss')
    };

    // 保存欠账记录
    app.saveDebt(debt);

    showToast('欠账记录已添加', 'success');

    // 返回上一页
    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  }
});
