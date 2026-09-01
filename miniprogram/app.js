// app.js
const formatDate = (date, format = 'YYYY-MM-DD') => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

App({
  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloudbase-7gofi8gv7108a860', // 云开发环境ID
        traceUser: true
      });
    }

    // 初始化本地存储
    this.initStorage();

    // 初始化自动上传配置
    this.initAutoUpload();

    // 启动时从云端下载数据并合并本地数据
    this.syncFromCloudOnLaunch();
  },

  // 初始化自动上传配置
  initAutoUpload() {
    const autoUploadEnabled = wx.getStorageSync('autoUploadEnabled');
    if (autoUploadEnabled === undefined || autoUploadEnabled === null) {
      // 默认开启自动上传
      wx.setStorageSync('autoUploadEnabled', true);
    }
  },

  // 设置自动上传开关
  setAutoUpload(enabled) {
    wx.setStorageSync('autoUploadEnabled', enabled);
  },

  // 获取自动上传状态
  getAutoUploadStatus() {
    return wx.getStorageSync('autoUploadEnabled') || false;
  },

  // 自动上传（在数据变更后调用）
  async autoUploadIfEnabled() {
    const enabled = this.getAutoUploadStatus();
    if (!enabled || !wx.cloud) {
      return false;
    }

    try {
      // 静默上传
      const result = await this.uploadToCloud(true);
      console.log('自动上传成功');
      return true;
    } catch (error) {
      console.error('自动上传失败:', error);
      // 静默失败，不干扰用户操作
      return false;
    }
  },

  // 启动时从云端同步数据
  async syncFromCloudOnLaunch() {
    if (!wx.cloud) {
      return;
    }

    try {
      // 先上传本地新数据
      await this.uploadToCloud(true);
      // 再从云端下载数据并合并
      await this.syncFromCloud(true);
      console.log('启动时云同步完成');
    } catch (error) {
      console.error('启动时云同步失败:', error);
      // 同步失败不影响应用使用
    }
  },

  initStorage() {
    // 初始化项目列表
    if (!wx.getStorageSync('projects')) {
      wx.setStorageSync('projects', []);
    }
    // 初始化车次列表
    if (!wx.getStorageSync('trucks')) {
      wx.setStorageSync('trucks', []);
    }
    // 初始化付款记录
    if (!wx.getStorageSync('payments')) {
      wx.setStorageSync('payments', []);
    }
    // 初始化欠账记录
    if (!wx.getStorageSync('debts')) {
      wx.setStorageSync('debts', []);
    }
    // 初始化分红记录
    if (!wx.getStorageSync('bonusRecords')) {
      wx.setStorageSync('bonusRecords', {});
    }
    // 初始化用户姓名
    if (!wx.getStorageSync('userName')) {
      wx.setStorageSync('userName', '');
    }
    if (!wx.getStorageSync('presetConfig')) {
      wx.setStorageSync('presetConfig', { deleted: {}, custom: {} });
    }
  },

  // 获取项目列表
  getProjects() {
    return wx.getStorageSync('projects') || [];
  },

  // 获取车次列表
  getTrucks(projectId) {
    const trucks = wx.getStorageSync('trucks') || [];
    if (projectId) {
      return trucks.filter(t => t.projectId === projectId);
    }
    return trucks;
  },

  // 获取付款记录
  getPayments(projectId) {
    const payments = wx.getStorageSync('payments') || [];
    if (projectId) {
      return payments.filter(p => p.projectId === projectId);
    }
    return payments;
  },

  // 保存项目
  saveProject(project) {
    const projects = this.getProjects();
    const existingIndex = projects.findIndex(p => p.projectId === project.projectId);

    if (existingIndex >= 0) {
      projects[existingIndex] = project;
    } else {
      projects.push(project);
    }

    wx.setStorageSync('projects', projects);

    // 自动上传
    this.autoUploadIfEnabled();

    return project;
  },

  // 删除项目
  async deleteProject(projectId) {
    let projects = this.getProjects();
    projects = projects.filter(p => p.projectId !== projectId);
    wx.setStorageSync('projects', projects);

    // 同时删除关联的车次和付款记录
    let trucks = wx.getStorageSync('trucks') || [];
    trucks = trucks.filter(t => t.projectId !== projectId);
    wx.setStorageSync('trucks', trucks);

    let payments = wx.getStorageSync('payments') || [];
    payments = payments.filter(p => p.projectId !== projectId);
    wx.setStorageSync('payments', payments);

    // 删除云数据
    if (wx.cloud) {
      try {
        const db = wx.cloud.database();
        await db.collection('projects').doc(projectId).remove();
        const allTrucks = await db.collection('trucks').where({ projectId }).get();
        for (const truck of allTrucks.data) {
          await db.collection('trucks').doc(truck.truckId).remove();
        }
        const allPayments = await db.collection('payments').where({ projectId }).get();
        for (const payment of allPayments.data) {
          await db.collection('payments').doc(payment.paymentId).remove();
        }
        const allDebts = await db.collection('debts').where({ projectId }).get();
        for (const debt of allDebts.data) {
          await db.collection('debts').doc(debt.debtId).remove();
        }
      } catch (error) {
      }
    }

    // 自动上传
    this.autoUploadIfEnabled();
  },

  // 保存车次
  saveTruck(truck) {
    const trucks = wx.getStorageSync('trucks') || [];
    const existingIndex = trucks.findIndex(t => t.truckId === truck.truckId);

    if (existingIndex >= 0) {
      trucks[existingIndex] = truck;
    } else {
      trucks.push(truck);
    }

    wx.setStorageSync('trucks', trucks);

    // 更新项目的车次数量
    this.updateProjectTruckCount(truck.projectId);

    // 自动上传
    this.autoUploadIfEnabled();

    return truck;
  },

  // 更新项目的车次数量
  updateProjectTruckCount(projectId) {
    const trucks = this.getTrucks(projectId);
    const count = trucks.length;
    const projects = this.getProjects();
    const project = projects.find(p => p.projectId === projectId);

    if (project) {
      project.totalTrucks = count;
      this.saveProject(project);
    }
  },

  // 删除车次
  async deleteTruck(truckId) {
    const trucks = wx.getStorageSync('trucks') || [];
    const truck = trucks.find(t => t.truckId === truckId);
    const filteredTrucks = trucks.filter(t => t.truckId !== truckId);
    wx.setStorageSync('trucks', filteredTrucks);

    if (truck) {
      this.updateProjectTruckCount(truck.projectId);
    }

    // 删除云数据
    if (wx.cloud && truckId) {
      try {
        const db = wx.cloud.database();
        await db.collection('trucks').doc(truckId).remove();
      } catch (error) {
      }
    }

    // 自动上传
    this.autoUploadIfEnabled();
  },

  // 保存付款记录
  savePayment(payment) {
    const payments = wx.getStorageSync('payments') || [];
    const existingIndex = payments.findIndex(p => p.paymentId === payment.paymentId);

    if (existingIndex >= 0) {
      payments[existingIndex] = payment;
    } else {
      payments.push(payment);
    }

    wx.setStorageSync('payments', payments);

    // 自动上传
    this.autoUploadIfEnabled();

    return payment;
  },

  // 删除付款记录
  async deletePayment(paymentId) {
    const payments = wx.getStorageSync('payments') || [];
    const filteredPayments = payments.filter(p => p.paymentId !== paymentId);
    wx.setStorageSync('payments', filteredPayments);

    // 删除云数据
    if (wx.cloud && paymentId) {
      try {
        const db = wx.cloud.database();
        await db.collection('payments').doc(paymentId).remove();
      } catch (error) {
      }
    }

    // 自动上传
    this.autoUploadIfEnabled();
  },

  // 获取欠账记录
  getDebts(projectId) {
    const debts = wx.getStorageSync('debts') || [];
    if (projectId) {
      return debts.filter(d => d.projectId === projectId);
    }
    return debts;
  },

  // 保存欠账记录
  saveDebt(debt) {
    const debts = wx.getStorageSync('debts') || [];
    const existingIndex = debts.findIndex(d => d.debtId === debt.debtId);

    if (existingIndex >= 0) {
      debts[existingIndex] = debt;
    } else {
      debts.push(debt);
    }

    wx.setStorageSync('debts', debts);

    // 自动上传
    this.autoUploadIfEnabled();

    return debt;
  },

  // 删除欠账记录
  async deleteDebt(debtId) {
    const debts = wx.getStorageSync('debts') || [];
    const filteredDebts = debts.filter(d => d.debtId !== debtId);
    wx.setStorageSync('debts', filteredDebts);

    // 删除云数据
    if (wx.cloud && debtId) {
      try {
        const db = wx.cloud.database();
        await db.collection('debts').doc(debtId).remove();
      } catch (error) {
      }
    }

    // 自动上传
    this.autoUploadIfEnabled();
  },

  // 更新欠账状态为已结清
  settleDebt(debtId) {
    const debts = wx.getStorageSync('debts') || [];
    const debt = debts.find(d => d.debtId === debtId);
    if (debt) {
      debt.isSettled = true;
      debt.settledDate = this.formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss');
      wx.setStorageSync('debts', debts);
    }
  },

  // 生成唯一ID
  generateId(prefix) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `${prefix}_${timestamp}_${random}`;
  },

  // 生成车次编号
  generateTruckNo(projectId, date) {
    const dateStr = date.replace(/-/g, '');
    const trucks = wx.getStorageSync('trucks') || [];
    // 车次序号按项目累计，避免跨日期或沿用上次记录时重复编号
    const projectTrucks = trucks.filter(t => t.projectId === projectId);
    const maxSeq = projectTrucks.reduce((max, truck) => {
      const match = String(truck.truckNo || '').match(/-(\d+)$/);
      return match ? Math.max(max, parseInt(match[1], 10) || 0) : max;
    }, 0);
    const seq = (maxSeq + 1).toString().padStart(3, '0');
    return `${dateStr}-${seq}`;
  },

  // 预设项配置：删除和自定义值持久化，避免页面重载后丢失
  getPresetConfig() {
    return wx.getStorageSync('presetConfig') || { deleted: {}, custom: {} };
  },

  getPresetList(type, defaults = [], history = []) {
    const config = this.getPresetConfig();
    const deleted = new Set(config.deleted && config.deleted[type] || []);
    const values = [...new Set([...(defaults || []), ...(config.custom && config.custom[type] || []), ...(history || [])])];
    return values.filter(value => !deleted.has(String(value)) && !deleted.has(value));
  },

  addPresetValue(type, value) {
    if (value === undefined || value === null || value === '') return;
    const config = this.getPresetConfig();
    config.custom = config.custom || {};
    config.custom[type] = [...new Set([...(config.custom[type] || []), value])];
    config.deleted = config.deleted || {};
    config.deleted[type] = (config.deleted[type] || []).filter(item => String(item) !== String(value));
    wx.setStorageSync('presetConfig', config);
    this.autoUploadIfEnabled();
  },

  removePresetValue(type, value) {
    const config = this.getPresetConfig();
    config.deleted = config.deleted || {};
    config.deleted[type] = [...new Set([...(config.deleted[type] || []), value])];
    if (config.custom && config.custom[type]) {
      config.custom[type] = config.custom[type].filter(item => String(item) !== String(value));
    }
    wx.setStorageSync('presetConfig', config);
    this.autoUploadIfEnabled();
  },

  // 计算项目统计数据
  calculateProjectStats(projectId) {
    const trucks = this.getTrucks(projectId);
    const payments = this.getPayments(projectId);

    let totalQuantity = 0;
    let totalAmount = 0;
    let concreteAmount = 0;
    let pumpCost = 0;

    trucks.forEach(truck => {
      totalQuantity += truck.quantity;
      // 计算每条车次的总金额（混凝土+泵车）
      const truckConcreteAmount = truck.quantity * truck.unitPrice;
      const truckPumpCost = truck.pumpCost || 0;
      concreteAmount += truckConcreteAmount;
      pumpCost += truckPumpCost;
      totalAmount += truckConcreteAmount + truckPumpCost;
    });

    let paidAmount = 0;
    payments.forEach(payment => {
      paidAmount += payment.amount;
    });

    const unpaidAmount = totalAmount - paidAmount;

    // 按日期分组统计
    const dailyStats = {};
    trucks.forEach(truck => {
      const date = truck.createTime.split(' ')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { quantity: 0, amount: 0 };
      }
      dailyStats[date].quantity += truck.quantity;
      dailyStats[date].amount += truck.unitPrice * truck.quantity;
    });

    // 付款方式分布
    const paymentMethodStats = {};
    payments.forEach(payment => {
      if (!paymentMethodStats[payment.paymentMethod]) {
        paymentMethodStats[payment.paymentMethod] = 0;
      }
      paymentMethodStats[payment.paymentMethod] += payment.amount;
    });

    return {
      totalTrucks: trucks.length,
      totalQuantity,
      totalAmount,
      concreteAmount: concreteAmount.toFixed(2),
      pumpCost: pumpCost.toFixed(2),
      paidAmount,
      unpaidAmount,
      dailyStats,
      paymentMethodStats,
      isPaidOff: unpaidAmount <= 0
    };
  },

  // 上传数据到云数据库
  // 上传数据到云数据库
  async uploadToCloud(silent = false) {
    if (!wx.cloud) {
      return { success: false, message: '云开发未初始化' };
    }

    if (!silent) {
      wx.showLoading({ title: '上传中...', mask: true });
    }

    try {
      const db = wx.cloud.database();

      // 获取本地数据
      const projects = this.getProjects();
      const trucks = wx.getStorageSync('trucks') || [];
      const payments = wx.getStorageSync('payments') || [];
      const debts = wx.getStorageSync('debts') || [];
      const bonusRecords = wx.getStorageSync('bonusRecords') || {};
      const userName = this.getUserName();
      const presetConfig = this.getPresetConfig();

      const serverTime = new Date().toISOString();

      // 上传项目（使用 add 避免覆盖冲突）
      for (const project of projects) {
        try {
          await db.collection('projects').doc(project.projectId).set({
            data: {
              ...project,
              updateTime: serverTime
            }
          });
        } catch (err) {
        }
      }

      // 上传车次
      for (const truck of trucks) {
        try {
          await db.collection('trucks').doc(truck.truckId).set({
            data: {
              ...truck,
              updateTime: serverTime
            }
          });
        } catch (err) {
        }
      }

      // 上传付款记录
      for (const payment of payments) {
        try {
          await db.collection('payments').doc(payment.paymentId).set({
            data: {
              ...payment,
              updateTime: serverTime
            }
          });
        } catch (err) {
        }
      }

      // 上传欠账记录
      for (const debt of debts) {
        try {
          await db.collection('debts').doc(debt.debtId).set({
            data: {
              ...debt,
              updateTime: serverTime
            }
          });
        } catch (err) {
        }
      }

      // 上传分红记录
      try {
        await db.collection('bonusRecords').doc('all').set({
          data: {
            records: bonusRecords,
            updateTime: serverTime
          }
        });
      } catch (err) {
      }

      // 上传用户姓名
      try {
        await db.collection('userInfo').doc('current').set({
          data: {
            userName: userName,
            updateTime: serverTime
          }
        });
      } catch (err) {
      }

      try {
        await db.collection('presetConfig').doc('current').set({
          data: { config: presetConfig, updateTime: serverTime }
        });
      } catch (err) {
      }

      // 上传工头-电话映射
      try {
        const foremanPhoneMap = wx.getStorageSync('foremanPhoneMap') || '{}';
        await db.collection('foremanPhoneMap').doc('current').set({
          data: {
            mapData: foremanPhoneMap,
            updateTime: serverTime
          }
        });
        console.log('工头-电话映射已上传到云端');
      } catch (err) {
        console.log('上传工头-电话映射失败:', err);
      }

      if (!silent) {
        wx.hideLoading();
        wx.showToast({
          title: '上传成功',
          icon: 'success',
          duration: 2000
        });
      }

      return { success: true, message: '上传成功' };
    } catch (error) {
      if (!silent) {
        wx.hideLoading();
      }

      let errorMsg = '上传失败';
      if (error.errMsg) {
        if (error.errMsg.includes('permission')) {
          errorMsg = '权限不足，请检查数据库权限配置';
        } else if (error.errMsg.includes('network')) {
          errorMsg = '网络错误，请检查网络连接';
        }
      }

      if (!silent) {
        wx.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 2000
        });
      }

      return { success: false, message: errorMsg, error };
    }
  },

  // 从云端获取所有数据的辅助函数（使用云函数绕过 20 条限制）
  async fetchAllFromCloud(collectionName) {
    try {
      // 调用云函数获取所有数据
      const res = await wx.cloud.callFunction({
        name: 'getAllData',
        data: {
          collectionName: collectionName
        }
      });

      if (res.result && res.result.success) {
        return res.result.data || [];
      } else {
        // 如果云函数失败，降级使用前端查询
        return await this.fetchAllFromCloudFallback(collectionName);
      }
    } catch (error) {
      // 如果云函数调用失败，降级使用前端查询
      return await this.fetchAllFromCloudFallback(collectionName);
    }
  },

  // 前端查询降级方案（受 20 条限制）
  async fetchAllFromCloudFallback(collectionName) {
    const db = wx.cloud.database();
    const MAX_LIMIT = 100;
    let allData = [];
    let hasMore = true;
    let skip = 0;

    while (hasMore) {
      try {
        const res = await db.collection(collectionName)
          .limit(MAX_LIMIT)
          .skip(skip)
          .get();

        allData = allData.concat(res.data || []);

        if (res.data.length === 0 || res.data.length < MAX_LIMIT) {
          hasMore = false;
        } else {
          skip += MAX_LIMIT;
        }
      } catch (error) {
        break;
      }
    }

    return allData;
  },

  // 从云数据库同步数据（智能合并）
  async syncFromCloud(silent = false) {
    if (!wx.cloud) {
      return { success: false, message: '云开发未初始化' };
    }

    if (!silent) {
      wx.showLoading({ title: '同步中...', mask: true });
    }

    try {
      const db = wx.cloud.database();

      // 获取本地数据
      const localProjects = this.getProjects();
      const localTrucks = wx.getStorageSync('trucks') || [];
      const localPayments = wx.getStorageSync('payments') || [];
      const localDebts = wx.getStorageSync('debts') || [];
      const localBonusRecords = wx.getStorageSync('bonusRecords') || {};
      const localUserName = this.getUserName();
      const localPresetConfig = this.getPresetConfig();

      // 从云端获取所有数据（使用分页查询）
      const cloudProjects = await this.fetchAllFromCloud('projects');
      const cloudTrucks = await this.fetchAllFromCloud('trucks');
      const cloudPayments = await this.fetchAllFromCloud('payments');
      const cloudDebts = await this.fetchAllFromCloud('debts');

      // bonusRecords 和 userInfo 使用单条记录方式
      const bonusRes = await db.collection('bonusRecords').get();
      const userRes = await db.collection('userInfo').get();
      const foremanMapRes = await db.collection('foremanPhoneMap').get();
      const presetConfigRes = await db.collection('presetConfig').get().catch(() => ({ data: [] }));

      const cloudBonusRecords = (bonusRes.data && bonusRes.data.length > 0) ? bonusRes.data[0].records || {} : {};
      const cloudUserName = (userRes.data && userRes.data.length > 0) ? userRes.data[0].userName || '' : '';
      const cloudForemanPhoneMap = (foremanMapRes.data && foremanMapRes.data.length > 0) ? foremanMapRes.data[0].mapData || '{}' : '{}';
      const cloudPresetConfig = (presetConfigRes.data && presetConfigRes.data.length > 0) ? presetConfigRes.data[0].config : null;

      // 调试信息：打印云端车次数据
      console.log('=== 云同步调试信息 ===');
      console.log('本地车次数量:', localTrucks.length);
      console.log('云端车次数量:', cloudTrucks.length);
      console.log('云端车次的 _openid 列表:', [...new Set(cloudTrucks.map(t => t._openid))]);
      console.log('云端车次数据包含的 projectId 列表:', [...new Set(cloudTrucks.map(t => t.projectId))]);
      console.log('云端车次数据包含的 truckId 列表:', [...new Set(cloudTrucks.map(t => t._id))]);

      // 特别检查高井培华项目相关的车次
      const gaojingTrucks = cloudTrucks.filter(t => t.projectId === 'project_1772859240727_744');
      console.log('高井培华项目的车次数量:', gaojingTrucks.length);
      console.log('高井培华项目的车次详情:', gaojingTrucks.map(t => ({truckId: t.truckId, projectId: t.projectId, driverName: t.driverName})));

      // 智能合并数据 - 重写车次合并逻辑
      const mergedProjects = this.smartMerge(localProjects, cloudProjects, 'projectId');
      const mergedTrucks = this.mergeTrucksData(localTrucks, cloudTrucks);
      const mergedPayments = this.smartMerge(localPayments, cloudPayments, 'paymentId');
      const mergedDebts = this.smartMerge(localDebts, cloudDebts, 'debtId');

      // 检查合并后的高井培华项目数据
      const gaojingProject = mergedProjects.find(p => p.projectId === 'project_1772859240727_744');
      console.log('=== 合并后高井培华项目检查 ===');
      console.log('合并后项目数据:', gaojingProject);
      console.log('合并后项目 totalTrucks:', gaojingProject?.totalTrucks);

      // 保存到本地存储
      wx.setStorageSync('projects', mergedProjects);
      wx.setStorageSync('trucks', mergedTrucks);
      wx.setStorageSync('payments', mergedPayments);
      wx.setStorageSync('debts', mergedDebts);
      wx.setStorageSync('bonusRecords', mergedBonusRecords);
      if (cloudUserName && !localUserName) {
        wx.setStorageSync('userName', cloudUserName);
      }
      if (cloudPresetConfig && (!localPresetConfig || Object.keys(localPresetConfig.custom || {}).length === 0)) {
        wx.setStorageSync('presetConfig', cloudPresetConfig);
      }

      // 合并并保存工头-电话映射
      try {
        const localForemanPhoneMapData = wx.getStorageSync('foremanPhoneMap') || '{}';
        const localForemanPhoneMap = JSON.parse(localForemanPhoneMapData);
        const parsedCloudForemanPhoneMap = JSON.parse(cloudForemanPhoneMap);

        // 合并映射关系，云端优先
        const mergedForemanPhoneMap = { ...localForemanPhoneMap, ...parsedCloudForemanPhoneMap };

        wx.setStorageSync('foremanPhoneMap', JSON.stringify(mergedForemanPhoneMap));
        console.log('工头-电话映射已合并并保存');
      } catch (error) {
        console.error('合并工头-电话映射失败:', error);
      }

      // 重新计算所有项目的统计数据
      mergedProjects.forEach(project => {
        const stats = this.calculateProjectStats(project.projectId);

        // 直接更新项目对象的统计字段
        project.totalTrucks = stats.totalTrucks;
        project.totalQuantity = stats.totalQuantity;
        project.totalAmount = stats.totalAmount;
        project.concreteAmount = stats.concreteAmount;
        project.pumpCost = stats.pumpCost;
        project.paidAmount = stats.paidAmount;
        project.unpaidAmount = stats.unpaidAmount;
      });

      // 保存更新后的项目数据
      wx.setStorageSync('projects', mergedProjects);
      console.log('=== 项目数据保存完成 ===');

      // 检查保存后的数据
      const savedGaojingProject = mergedProjects.find(p => p.projectId === 'project_1772859240727_744');
      console.log('高井培华项目保存后的车次数量:', savedGaojingProject?.totalTrucks);
      console.log('高井培华项目保存后的完整数据:', savedGaojingProject);

      // 从存储中重新读取验证
      const storedProjects = wx.getStorageSync('projects') || [];
      const storedGaojingProject = storedProjects.find(p => p.projectId === 'project_1772859240727_744');
      console.log('存储中高井培华项目的车次数量:', storedGaojingProject?.totalTrucks);

      if (!silent) {
        wx.hideLoading();
        wx.showToast({
          title: '同步成功',
          icon: 'success',
          duration: 2000
        });
      }

      return { success: true, message: '同步成功' };
    } catch (error) {
      if (!silent) {
        wx.hideLoading();
      }

      let errorMsg = '同步失败';
      if (error.errMsg) {
        if (error.errMsg.includes('permission')) {
          errorMsg = '权限不足';
        } else if (error.errMsg.includes('network')) {
          errorMsg = '网络错误';
        }
      }

      if (!silent) {
        wx.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 2000
        });
      }

      return { success: false, message: errorMsg, error };
    }
  },

  // 智能合并函数
  smartMerge(localData, cloudData, idField) {
    const mergedMap = new Map();

    // 先添加本地数据，使用 idField 作为 key
    localData.forEach(item => {
      if (item[idField]) {
        mergedMap.set(item[idField], item);
      }
    });

    // 云端数据合并，根据 updateTime 比较保留最新的
    cloudData.forEach(cloudItem => {
      // 对于项目数据，使用 projectId 字段作为业务 ID
      // 对于其他数据，使用 _id 作为业务 ID
      const businessId = idField === 'projectId' ? (cloudItem.projectId || cloudItem._id) : cloudItem._id;

      if (!businessId) {
        return;
      }

      const localItem = mergedMap.get(businessId);

      if (localItem) {
        // 都存在，比较更新时间
        const localTime = localItem.updateTime ? new Date(localItem.updateTime).getTime() : 0;
        const cloudTime = cloudItem.updateTime ? new Date(cloudItem.updateTime).getTime() : 0;

        // 特别调试高井培华项目
        if (idField === 'projectId' && businessId === 'project_1772859240727_744') {
          console.log('=== 高井培华项目合并调试 ===');
          console.log('本地数据 totalTrucks:', localItem.totalTrucks);
          console.log('云端数据 totalTrucks:', cloudItem.totalTrucks);
          console.log('本地更新时间:', localTime);
          console.log('云端更新时间:', cloudTime);
        }

        if (cloudTime > localTime) {
          // 确保云端数据有正确的 idField 字段
          if (!cloudItem[idField]) {
            cloudItem[idField] = businessId;
          }

          // 对于项目数据，清空统计字段，让后续重新计算
          if (idField === 'projectId') {
            cloudItem.totalTrucks = 0;
            cloudItem.totalQuantity = 0;
            cloudItem.totalAmount = 0;
            cloudItem.concreteAmount = 0;
            cloudItem.pumpCost = 0;
            cloudItem.paidAmount = 0;
            cloudItem.unpaidAmount = 0;
          }

          mergedMap.set(businessId, cloudItem);
        } else {
          // 保留本地数据
          mergedMap.set(businessId, localItem);
        }
      } else {
        // 只有云端有，添加到本地
        // 确保云端数据有正确的 idField 字段
        if (!cloudItem[idField]) {
          cloudItem[idField] = businessId;
        }
        mergedMap.set(businessId, cloudItem);
      }
    });

    return Array.from(mergedMap.values());
  },

  // 车次数据专用合并函数
  mergeTrucksData(localTrucks, cloudTrucks) {
    const mergedMap = new Map();

    // 先添加本地数据
    localTrucks.forEach(truck => {
      if (truck.truckId) {
        mergedMap.set(truck.truckId, truck);
      }
    });

    // 合并云端数据
    cloudTrucks.forEach(cloudTruck => {
      // 云端数据的 _id 就是 truckId
      const truckId = cloudTruck._id;

      if (!truckId) {
        return;
      }

      // 确保 truckId 字段存在
      if (!cloudTruck.truckId) {
        cloudTruck.truckId = truckId;
      }

      const localTruck = mergedMap.get(truckId);

      if (localTruck) {
        // 比较更新时间，保留最新的
        const localTime = localTruck.updateTime ? new Date(localTruck.updateTime).getTime() : 0;
        const cloudTime = cloudTruck.updateTime ? new Date(cloudTruck.updateTime).getTime() : 0;

        if (cloudTime >= localTime) {
          mergedMap.set(truckId, cloudTruck);
        }
      } else {
        // 云端独有的车次，直接添加
        mergedMap.set(truckId, cloudTruck);
      }
    });

    return Array.from(mergedMap.values());
  },

  // ========== 分红记录相关 ==========

  // 获取分红记录
  getBonusRecords(projectId) {
    const allBonusRecords = wx.getStorageSync('bonusRecords') || {};
    if (projectId) {
      return allBonusRecords[projectId] || [];
    }
    return allBonusRecords;
  },

  // 添加分红记录
  addBonusRecord(projectId, record) {
    const allBonusRecords = wx.getStorageSync('bonusRecords') || {};
    if (!allBonusRecords[projectId]) {
      allBonusRecords[projectId] = [];
    }
    allBonusRecords[projectId].push(record);
    wx.setStorageSync('bonusRecords', allBonusRecords);
    this.autoUploadIfEnabled();
    return record;
  },

  // 删除分红记录
  deleteBonusRecord(projectId, index) {
    const allBonusRecords = wx.getStorageSync('bonusRecords') || {};
    if (allBonusRecords[projectId] && allBonusRecords[projectId][index]) {
      allBonusRecords[projectId].splice(index, 1);
      wx.setStorageSync('bonusRecords', allBonusRecords);
      this.autoUploadIfEnabled();
    }
  },

  // ========== 用户姓名相关 ==========

  // 获取用户姓名
  getUserName() {
    return wx.getStorageSync('userName') || '';
  },

  // 设置用户姓名
  setUserName(name) {
    wx.setStorageSync('userName', name);
    this.autoUploadIfEnabled();
  },

  // ========== 清空所有数据 ==========
  clearAllData() {
    wx.setStorageSync('projects', []);
    wx.setStorageSync('trucks', []);
    wx.setStorageSync('payments', []);
    wx.setStorageSync('debts', []);
    wx.setStorageSync('bonusRecords', {});
    wx.setStorageSync('userName', '');
    wx.setStorageSync('presetConfig', { deleted: {}, custom: {} });
  }
});
