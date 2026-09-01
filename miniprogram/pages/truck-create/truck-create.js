// 创建车次页面逻辑
const app = getApp();
const { formatDate, validateRequired, showToast, showConfirm } = require('../../utils/util.js');

Page({
  data: {
    projectId: '',
    truckId: '', // 编辑时使用
    isEdit: false,
    truckNo: '',
    driverName: '',
    licensePlate: '',
    constructionSite: '',
    strengthGrades: ['C15', 'C20', 'C25', 'C30', 'C35', 'C40', 'C45', 'C50', 'C55', 'C60'],
    gradeIndex: -1,
    unitPrice: '',
    quantity: '',
    pumpDriver: '',
    pumpCost: '',
    remarks: '',
    presetDrivers: ['孙义领', '张浴东', '李林华', '田勇', '刘记', '郭自华'],
    presetPlates: ['2180', '0529', '6378', '6792', '6027'],
    presetSites: ['一层顶', '地面', '一层柱', '斜坡', '檐线'],
    presetPrices: [240, 250, 260, 280, 300],
    presetQuantities: [4, 5, 6, 7, 8, 13],
    presetPumpDrivers: ['小王', '李梦圆', '刘辉'],
    presetPumpCosts: [0, 100, 200, 300, 500],
    previewAmount: '',
    concreteAmount: '',
    previewVisible: false,
    previewItems: [],
    showUseLastModal: false,
    lastTruck: null,
    isEditingTruckNo: false,
    showCustomSite: false,
    showCustomGrade: false,
    customStrengthGrade: '',
    showDeletePreset: false,
    deleteType: '',
    deleteIndex: -1,
    showCustomDriver: false,
    showCustomPlate: false,
    showCustomPrice: false,
    showCustomQuantity: false,
    showCustomPumpDriver: false,
    showCustomPumpCost: false
  },

  onLoad(options) {
    const { projectId, truckId } = options;

    this.setData({
      projectId,
      truckId: truckId || '',
      isEdit: !!truckId
    });

    // 如果是编辑模式，加载车次数据
    if (truckId) {
      this.loadTruckData(truckId);
    } else {
      // 新建模式：加载历史数据
      this.loadHistoryData();
      // 生成车次编号
      this.generateTruckNo();
      // 检查是否显示沿用上次选项弹窗
      this.checkShowUseLastModal();
    }
  },

  // 加载车次数据（编辑模式）
  loadTruckData(truckId) {
    const trucks = app.getTrucks(this.data.projectId);
    const truck = trucks.find(t => t.truckId === truckId);

    if (truck) {
      // 确定强度等级索引
      const gradeIndex = this.data.strengthGrades.indexOf(truck.strengthGrade);
      const isCustomGrade = gradeIndex < 0;

      this.setData({
        truckNo: truck.truckNo,
        driverName: truck.driverName,
        licensePlate: truck.licensePlate,
        constructionSite: truck.constructionSite,
        gradeIndex: isCustomGrade ? -1 : gradeIndex,
        customStrengthGrade: isCustomGrade ? truck.strengthGrade : '',
        unitPrice: truck.unitPrice,
        quantity: truck.quantity,
        pumpDriver: truck.pumpDriver || '',
        pumpCost: truck.pumpCost || 0,
        remarks: truck.remarks || ''
      });

      this.calculatePreviewAmount();
    }
  },

  // 生成车次编号
  generateTruckNo() {
    const today = formatDate(new Date());
    const truckNo = app.generateTruckNo(this.data.projectId, today);
    this.setData({ truckNo });
  },

  // 检查是否显示沿用上次选项弹窗
  checkShowUseLastModal() {
    const trucks = app.getTrucks(this.data.projectId);
    if (trucks.length > 0) {
      const lastTruck = trucks[trucks.length - 1];
      this.setData({ 
        lastTruck,
        showUseLastModal: true
      });
    }
  },

  // 关闭沿用上次选项弹窗
  closeUseLastModal() {
    this.setData({ showUseLastModal: false });
  },

  // 沿用上次选项
  useLastOptions() {
    const lastTruck = this.data.lastTruck;

    this.setData({
      driverName: lastTruck.driverName,
      licensePlate: lastTruck.licensePlate,
      constructionSite: lastTruck.constructionSite,
      unitPrice: lastTruck.unitPrice,
      quantity: lastTruck.quantity,
      pumpDriver: lastTruck.pumpDriver || '',
      pumpCost: lastTruck.pumpCost || 0,
      remarks: lastTruck.remarks || '',
      gradeIndex: this.data.strengthGrades.indexOf(lastTruck.strengthGrade),
      showUseLastModal: false
    });

    // 重新生成车次编号（不沿用上次的编号）
    this.generateTruckNo();
    this.calculatePreviewAmount();
  },

  // 加载历史数据（跨工程复用）
  loadHistoryData() {
    // 获取所有项目的车次数据，实现跨工程复用
    const allTrucks = app.getTrucks(); // 不传参数则获取所有项目的车次

    // 提取历史数据
    const driverNames = [...new Set(allTrucks.map(t => t.driverName))];
    const licensePlates = [...new Set(allTrucks.map(t => t.licensePlate))];
    const sites = [...new Set(allTrucks.map(t => t.constructionSite))];
    const prices = [...new Set(allTrucks.map(t => t.unitPrice))];
    const quantities = [...new Set(allTrucks.map(t => t.quantity))];
    const pumpDrivers = [...new Set(allTrucks.map(t => t.pumpDriver).filter(d => d))];
    const grades = [...new Set(allTrucks.map(t => t.strengthGrade).filter(g => g))];

    // 合并预设和历史数据
    const pumpCosts = [...new Set(allTrucks.map(t => t.pumpCost).filter(v => v !== undefined && v !== null))];
    const allDrivers = app.getPresetList('driver', this.data.presetDrivers, driverNames);
    const allPlates = app.getPresetList('plate', this.data.presetPlates, licensePlates);
    const allSites = app.getPresetList('site', this.data.presetSites, sites);
    const allPrices = app.getPresetList('price', this.data.presetPrices, prices);
    const allQuantities = app.getPresetList('quantity', this.data.presetQuantities, quantities);
    const allPumpDrivers = app.getPresetList('pumpDriver', this.data.presetPumpDrivers, pumpDrivers);
    const allPumpCosts = app.getPresetList('pumpCost', this.data.presetPumpCosts, pumpCosts);
    const allGrades = app.getPresetList('grade', this.data.strengthGrades, grades);

    this.setData({
      presetDrivers: allDrivers,
      presetPlates: allPlates,
      presetSites: allSites,
      presetPrices: allPrices,
      presetQuantities: allQuantities,
      presetPumpDrivers: allPumpDrivers,
      presetPumpCosts: allPumpCosts,
      strengthGrades: allGrades
    });
  },

  // 编辑车次编号
  editTruckNo() {
    this.setData({ isEditingTruckNo: true });
    wx.showModal({
      title: '修改车次编号',
      editable: true,
      placeholderText: '请输入车次编号',
      success: (res) => {
        if (res.confirm && res.content) {
          this.setData({ truckNo: res.content });
        }
        this.setData({ isEditingTruckNo: false });
      }
    });
  },

  // 司机姓名输入
  onDriverNameInput(e) {
    this.setData({ driverName: e.detail.value });
  },

  // 选择预设司机
  selectDriver(e) {
    if (this.data.showDeletePreset) return;
    const name = e.currentTarget.dataset.name;
    this.setData({
      driverName: name,
      showCustomDriver: false
    });
  },

  // 显示自定义司机输入
  showCustomDriverInput() {
    this.setData({
      showCustomDriver: true,
      driverName: ''
    });
  },

  // 隐藏自定义司机输入
  hideCustomDriverInput() {
    this.setData({ showCustomDriver: false });
  },

  // 车牌输入
  onLicensePlateInput(e) {
    this.setData({ licensePlate: e.detail.value });
  },

  // 选择预设车牌
  selectPlate(e) {
    if (this.data.showDeletePreset) return;
    const plate = e.currentTarget.dataset.plate;
    this.setData({
      licensePlate: plate,
      showCustomPlate: false
    });
  },

  // 显示自定义车牌输入
  showCustomPlateInput() {
    this.setData({
      showCustomPlate: true,
      licensePlate: ''
    });
  },

  // 隐藏自定义车牌输入
  hideCustomPlateInput() {
    this.setData({ showCustomPlate: false });
  },

  // 选择施工部位
  selectSite(e) {
    if (this.data.showDeletePreset) return;
    const site = e.currentTarget.dataset.site;
    this.setData({
      constructionSite: site,
      showCustomSite: false
    });
  },

  // 显示自定义施工部位输入框
  showCustomSiteInput() {
    this.setData({
      showCustomSite: true,
      constructionSite: ''
    });
  },

  // 隐藏自定义施工部位输入框
  hideCustomSiteInput() {
    this.setData({ showCustomSite: false });
  },

  // 自定义施工部位输入
  onSiteInput(e) {
    this.setData({ constructionSite: e.detail.value });
  },

  // 强度等级选择
  onGradeChange(e) {
    this.setData({ gradeIndex: e.detail.value });
  },

  // 显示自定义强度等级输入框
  showCustomGradeInput() {
    this.setData({
      showCustomGrade: true,
      gradeIndex: -1,
      customStrengthGrade: ''
    });
  },

  // 隐藏自定义强度等级输入框
  hideCustomGradeInput() {
    this.setData({ showCustomGrade: false });
  },

  // 自定义强度等级输入
  onCustomGradeInput(e) {
    this.setData({ customStrengthGrade: e.detail.value });
  },

  // 选择强度等级
  selectGrade(e) {
    if (this.data.showDeletePreset) return;
    const index = e.currentTarget.dataset.index;
    this.setData({ gradeIndex: index });
  },

  // 单价输入
  onUnitPriceInput(e) {
    this.setData({ unitPrice: e.detail.value });
    this.calculatePreviewAmount();
  },

  // 选择预设单价
  selectPrice(e) {
    if (this.data.showDeletePreset) return;
    const price = e.currentTarget.dataset.price;
    this.setData({
      unitPrice: price,
      showCustomPrice: false
    });
    this.calculatePreviewAmount();
  },

  // 显示自定义单价输入
  showCustomPriceInput() {
    this.setData({
      showCustomPrice: true,
      unitPrice: ''
    });
  },

  // 隐藏自定义单价输入
  hideCustomPriceInput() {
    this.setData({ showCustomPrice: false });
  },

  // 方数输入
  onQuantityInput(e) {
    this.setData({ quantity: e.detail.value });
    this.calculatePreviewAmount();
  },

  // 选择预设方数
  selectQuantity(e) {
    if (this.data.showDeletePreset) return;
    const quantity = e.currentTarget.dataset.quantity;
    this.setData({
      quantity,
      showCustomQuantity: false
    });
    this.calculatePreviewAmount();
  },

  // 显示自定义方数输入
  showCustomQuantityInput() {
    this.setData({
      showCustomQuantity: true,
      quantity: ''
    });
  },

  // 隐藏自定义方数输入
  hideCustomQuantityInput() {
    this.setData({ showCustomQuantity: false });
  },

  // 泵车费用输入
  onPumpCostInput(e) {
    this.setData({ pumpCost: e.detail.value });
    this.calculatePreviewAmount();
  },

  // 选择预设泵车费用
  selectPumpCost(e) {
    if (this.data.showDeletePreset) return;
    const cost = e.currentTarget.dataset.cost;
    this.setData({ pumpCost: cost });
    this.calculatePreviewAmount();
  },

  showCustomPumpCostInput() {
    this.setData({ showCustomPumpCost: true, pumpCost: '' });
  },

  hideCustomPumpCostInput() {
    this.setData({ showCustomPumpCost: false });
  },

  // 两个快捷随机按钮用于现场测试
  randomPumpDriver(e) {
    const index = Number(e.currentTarget.dataset.index) || 0;
    const list = this.data.presetPumpDrivers.length ? this.data.presetPumpDrivers : ['小王', '李梦圆', '刘辉'];
    this.setData({ pumpDriver: list[index % list.length], showCustomPumpDriver: false });
  },

  // 泵车司机输入
  onPumpDriverInput(e) {
    this.setData({ pumpDriver: e.detail.value });
  },

  // 选择预设泵车司机
  selectPumpDriver(e) {
    if (this.data.showDeletePreset) return;
    const driver = e.currentTarget.dataset.driver;
    this.setData({
      pumpDriver: driver,
      showCustomPumpDriver: false
    });
  },

  // 显示自定义泵车司机输入
  showCustomPumpDriverInput() {
    this.setData({
      showCustomPumpDriver: true,
      pumpDriver: ''
    });
  },

  // 隐藏自定义泵车司机输入
  hideCustomPumpDriverInput() {
    this.setData({ showCustomPumpDriver: false });
  },

  // 备注输入
  onRemarksInput(e) {
    this.setData({ remarks: e.detail.value });
  },

  // 计算预览金额
  calculatePreviewAmount() {
    const { unitPrice, quantity, pumpCost } = this.data;
    if (unitPrice && quantity) {
      const concreteAmount = (parseFloat(unitPrice) * parseFloat(quantity)).toFixed(2);
      const pumpCostValue = pumpCost ? parseFloat(pumpCost) : 0;
      const totalAmount = (parseFloat(concreteAmount) + pumpCostValue).toFixed(2);
      this.setData({ 
        concreteAmount,
        previewAmount: totalAmount
      });
    } else {
      this.setData({ 
        concreteAmount: '',
        previewAmount: ''
      });
    }
  },

  // 预览
  onPreview() {
    if (!this.validateForm()) return;

    // 确定使用的强度等级
    const strengthGrade = this.data.gradeIndex >= 0
      ? this.data.strengthGrades[this.data.gradeIndex]
      : this.data.customStrengthGrade;

    // 构建预览数据
    const previewItems = [
      { label: '车次编号', value: this.data.truckNo },
      { label: '司机姓名', value: this.data.driverName },
      { label: '车牌号码', value: this.data.licensePlate },
      { label: '施工部位', value: this.data.constructionSite },
      { label: '强度等级', value: strengthGrade },
      { label: '单价', value: `¥${this.data.unitPrice}/方` },
      { label: '方数', value: `${this.data.quantity}方` },
    ];

    const pumpCost = parseFloat(this.data.pumpCost) || 0;
    if (pumpCost > 0) {
      previewItems.push({ label: '泵车费用', value: `¥${pumpCost}` });
    }

    if (this.data.remarks) {
      previewItems.push({ label: '备注', value: this.data.remarks });
    }

    previewItems.push({ label: '总金额', value: `¥${this.data.previewAmount}` });

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
    this.submitTruck();
  },

  // 提交车次
  submitTruck() {
    if (!this.validateForm()) return;

    // 确定使用的强度等级
    const strengthGrade = this.data.gradeIndex >= 0
      ? this.data.strengthGrades[this.data.gradeIndex]
      : this.data.customStrengthGrade;

    // 创建车次对象
    const creator = app.getUserName() || '';
    const truck = {
      truckId: this.data.truckId || app.generateId('truck'),
      projectId: this.data.projectId,
      truckNo: this.data.truckNo,
      driverName: this.data.driverName,
      licensePlate: this.data.licensePlate,
      constructionSite: this.data.constructionSite,
      strengthGrade: strengthGrade,
      unitPrice: parseFloat(this.data.unitPrice),
      quantity: parseFloat(this.data.quantity),
      pumpDriver: this.data.pumpDriver || '',
      pumpCost: parseFloat(this.data.pumpCost) || 0,
      remarks: this.data.remarks,
      createTime: formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss'),
      creator: creator,
      updateTime: new Date().toISOString()
    };

    // 本次自定义值下次可直接复用
    app.addPresetValue('driver', truck.driverName);
    app.addPresetValue('plate', truck.licensePlate);
    app.addPresetValue('site', truck.constructionSite);
    app.addPresetValue('price', truck.unitPrice);
    app.addPresetValue('quantity', truck.quantity);
    app.addPresetValue('grade', truck.strengthGrade);
    app.addPresetValue('pumpDriver', truck.pumpDriver);
    app.addPresetValue('pumpCost', truck.pumpCost);

    // 保存车次
    app.saveTruck(truck);

    showToast(this.data.isEdit ? '车次修改成功' : '车次登记成功', 'success');

    // 返回上一页
    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  },

  // 表单验证
  validateForm() {
    if (!validateRequired(this.data.driverName, '司机姓名')) return false;
    if (!validateRequired(this.data.licensePlate, '车牌号码')) return false;
    if (!validateRequired(this.data.constructionSite, '施工部位')) return false;

    // 验证强度等级（预设或自定义）
    if (this.data.gradeIndex < 0 && !this.data.customStrengthGrade) {
      showToast('请选择或输入强度等级');
      return false;
    }

    if (!validateRequired(this.data.unitPrice, '单价')) return false;
    if (!validateRequired(this.data.quantity, '方数')) return false;

    return true;
  },

  // 确认提交
  onConfirm() {
    this.submitTruck();
  },

  // 长按预设选项
  handlePresetLongPress(e) {
    const { type, index } = e.currentTarget.dataset;
    this.setData({
      showDeletePreset: true,
      deleteType: type,
      deleteIndex: index
    });
  },

  // 删除预设选项
  deletePresetItem(e) {
    const { type, index } = e.currentTarget.dataset;

    wx.showModal({
      title: '删除确认',
      content: '确定要删除这个预设选项吗？',
      confirmColor: '#FF4D4F',
      success: (res) => {
        if (res.confirm) {
          let key = '';
          switch (type) {
            case 'driver':
              key = 'presetDrivers';
              break;
            case 'plate':
              key = 'presetPlates';
              break;
            case 'site':
              key = 'presetSites';
              break;
            case 'grade':
              key = 'strengthGrades';
              break;
            case 'price':
              key = 'presetPrices';
              break;
            case 'quantity':
              key = 'presetQuantities';
              break;
            case 'pumpDriver':
              key = 'presetPumpDrivers';
              break;
            case 'pumpCost':
              key = 'presetPumpCosts';
              break;
          }

          if (key) {
            const list = [...this.data[key]];
            list.splice(index, 1);
            app.removePresetValue(type, this.data[key][index]);
            this.setData({
              [key]: list,
              showDeletePreset: false,
              deleteType: '',
              deleteIndex: -1
            });
            showToast('预设选项已删除', 'success');
          }
        }
      }
    });
  }
});
