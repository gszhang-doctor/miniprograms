// 创建付款页面逻辑
const app = getApp();
const { formatDate, validateRequired, showToast } = require('../../utils/util.js');

Page({
  data: {
    projectId: '',
    paymentDate: '',
    paymentMethods: ['现金', '微信', '支付宝', '银行转账'],
    methodIndex: -1,
    amount: '',
    remarks: '',
    quickAmounts: [],
    unpaidAmount: 0,
    minDate: '',
    maxDate: '',
    images: [],  // 存储上传的图片临时路径
    previewVisible: false,
    previewItems: []
  },

  onLoad(options) {
    const { projectId } = options;
    
    // 设置默认日期为今天
    const today = formatDate(new Date());
    
    // 设置日期范围
    const minDate = formatDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
    const maxDate = formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

    // 计算未付款金额
    const stats = app.calculateProjectStats(projectId);
    const unpaidAmount = parseFloat(stats.unpaidAmount).toFixed(2);

    // 生成快捷金额选项
    const quickAmounts = this.generateQuickAmounts(unpaidAmount);

    this.setData({
      projectId,
      paymentDate: today,
      unpaidAmount,
      quickAmounts,
      minDate,
      maxDate
    });
  },

  // 生成快捷金额选项
  generateQuickAmounts(unpaidAmount) {
    const amounts = [];
    const total = parseFloat(unpaidAmount);
    
    if (total > 0) {
      // 添加全额付款选项
      amounts.push(total.toFixed(2));
      
      // 添加百分比选项
      const percentages = [0.25, 0.5, 0.75];
      percentages.forEach(p => {
        const amount = (total * p).toFixed(2);
        if (!amounts.includes(amount)) {
          amounts.push(amount);
        }
      });
      
      // 添加常见整数金额
      [1000, 2000, 5000, 10000].forEach(amt => {
        if (amt < total && !amounts.includes(amt)) {
          amounts.push(amt);
        }
      });
    }

    return amounts;
  },

  // 日期选择
  onDateChange(e) {
    this.setData({ paymentDate: e.detail.value });
  },

  // 付款方式选择
  onMethodChange(e) {
    this.setData({ methodIndex: e.detail.value });
  },

  // 选择付款方式
  selectMethod(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ methodIndex: index });
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

  // 付款金额输入
  onAmountInput(e) {
    this.setData({ amount: e.detail.value });
  },

  // 选择快捷金额
  selectQuickAmount(e) {
    const amount = e.currentTarget.dataset.amount;
    this.setData({ amount });
  },

  // 备注输入
  onRemarksInput(e) {
    this.setData({ remarks: e.detail.value });
  },

  // 选择图片
  chooseImage() {
    const that = this;
    wx.showActionSheet({
      itemList: ['拍照', '从相册选择'],
      success(res) {
        if (res.tapIndex === 0) {
          that.takePhoto();
        } else if (res.tapIndex === 1) {
          that.chooseFromAlbum();
        }
      }
    });
  },

  // 拍照
  takePhoto() {
    const that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['camera'],
      success(res) {
        const tempFilePaths = res.tempFilePaths;
        that.addImages(tempFilePaths);
      }
    });
  },

  // 从相册选择
  chooseFromAlbum() {
    const that = this;
    wx.chooseImage({
      count: 3 - that.data.images.length,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success(res) {
        const tempFilePaths = res.tempFilePaths;
        that.addImages(tempFilePaths);
      }
    });
  },

  // 添加图片
  addImages(tempFilePaths) {
    const images = [...this.data.images, ...tempFilePaths];
    this.setData({ images });
  },

  // 预览图片
  previewImage(e) {
    const index = e.currentTarget.dataset.index;
    wx.previewImage({
      current: this.data.images[index],
      urls: this.data.images
    });
  },

  // 删除图片
  deleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.images.filter((_, i) => i !== index);
    this.setData({ images });
  },

  // 预览
  onPreview() {
    if (!this.validateForm()) return;

    // 构建预览数据
    const previewItems = [
      { label: '付款日期', value: this.data.paymentDate },
      { label: '付款方式', value: this.data.paymentMethods[this.data.methodIndex] },
      { label: '付款金额', value: `¥${this.data.amount}` }
    ];

    // 如果有备注，添加到预览
    if (this.data.remarks) {
      previewItems.push({ label: '备注信息', value: this.data.remarks });
    }

    // 如果有图片，添加到预览
    if (this.data.images.length > 0) {
      previewItems.push({ label: '已上传图片', value: `${this.data.images.length}张` });
    }

    this.setData({
      previewItems,
      previewVisible: true
    });
  },

  // 预览弹窗取消
  onPreviewCancel() {
    this.setData({ previewVisible: false });
  },

  // 预览弹窗确认
  onPreviewConfirm() {
    this.setData({ previewVisible: false });
    this.submitPayment();
  },

  // 提交付款
  submitPayment() {
    if (!this.validateForm()) return;

    // 创建付款记录
    const payment = {
      paymentId: app.generateId('payment'),
      projectId: this.data.projectId,
      paymentDate: this.data.paymentDate,
      paymentMethod: this.data.paymentMethods[this.data.methodIndex],
      amount: parseFloat(this.data.amount),
      remarks: this.data.remarks,
      images: this.data.images,  // 保存图片路径
      createTime: formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss'),
      creator: app.getUserName() || '',
      updateTime: new Date().toISOString()
    };

    // 保存付款记录
    app.savePayment(payment);

    showToast('付款记录已添加', 'success');

    // 返回上一页
    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  },

  // 表单验证
  validateForm() {
    if (!validateRequired(this.data.paymentDate, '付款日期')) return false;
    if (this.data.methodIndex < 0) {
      showToast('请选择付款方式');
      return false;
    }
    if (!validateRequired(this.data.amount, '付款金额')) return false;
    
    // 验证金额格式
    const amount = parseFloat(this.data.amount);
    if (isNaN(amount) || amount <= 0) {
      showToast('请输入有效的付款金额');
      return false;
    }

    return true;
  },

  // 确认付款
  onConfirm() {
    this.submitPayment();
  }
});
