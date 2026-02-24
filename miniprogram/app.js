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
        console.error('删除云数据失败:', error);
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
        console.error('删除云数据失败:', error);
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
        console.error('删除云数据失败:', error);
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
        console.error('删除云数据失败:', error);
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
    // 只计算当前项目的当天车次
    const todayTrucks = trucks.filter(t =>
      t.projectId === projectId && t.createTime.startsWith(date)
    );
    const seq = (todayTrucks.length + 1).toString().padStart(3, '0');
    return `${dateStr}-${seq}`;
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
          console.warn('上传项目失败:', project.projectId, err);
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
          console.warn('上传车次失败:', truck.truckId, err);
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
          console.warn('上传付款失败:', payment.paymentId, err);
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
          console.warn('上传欠账失败:', debt.debtId, err);
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
        console.warn('上传分红记录失败:', err);
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
        console.warn('上传用户姓名失败:', err);
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
      console.error('上传失败:', error);

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

      // 从云端获取所有数据
      const [projectsRes, trucksRes, paymentsRes, debtsRes, bonusRes, userRes] = await Promise.all([
        db.collection('projects').get(),
        db.collection('trucks').get(),
        db.collection('payments').get(),
        db.collection('debts').get(),
        db.collection('bonusRecords').get(),
        db.collection('userInfo').get()
      ]);

      const cloudProjects = projectsRes.data || [];
      const cloudTrucks = trucksRes.data || [];
      const cloudPayments = paymentsRes.data || [];
      const cloudDebts = debtsRes.data || [];
      const cloudBonusRecords = (bonusRes.data && bonusRes.data.length > 0) ? bonusRes.data[0].records || {} : {};
      const cloudUserName = (userRes.data && userRes.data.length > 0) ? userRes.data[0].userName || '' : '';

      console.log('云端数据:', {
        projects: cloudProjects.length,
        trucks: cloudTrucks.length,
        payments: cloudPayments.length,
        debts: cloudDebts.length,
        bonusRecords: Object.keys(cloudBonusRecords).length,
        userName: cloudUserName
      });

      // 智能合并数据
      const mergedProjects = this.smartMerge(localProjects, cloudProjects, 'projectId');
      const mergedTrucks = this.smartMerge(localTrucks, cloudTrucks, 'truckId');
      const mergedPayments = this.smartMerge(localPayments, cloudPayments, 'paymentId');
      const mergedDebts = this.smartMerge(localDebts, cloudDebts, 'debtId');

      // 合并分红记录
      const mergedBonusRecords = { ...localBonusRecords, ...cloudBonusRecords };

      // 合并用户姓名（优先使用本地姓名）
      const mergedUserName = localUserName || cloudUserName;

      // 排序项目
      mergedProjects.sort((a, b) => {
        const dateA = a.createDate || '';
        const dateB = b.createDate || '';

        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;

        const dateCompare = dateB.localeCompare(dateA);
        if (dateCompare !== 0) {
          return dateCompare;
        }

        const timeA = a.createTime || '';
        const timeB = b.createTime || '';

        if (!timeA && !timeB) return 0;
        if (!timeA) return 1;
        if (!timeB) return -1;

        const timeDateA = new Date(timeA);
        const timeDateB = new Date(timeB);
        return timeDateB - timeDateA;
      });

      // 保存到本地存储
      wx.setStorageSync('projects', mergedProjects);
      wx.setStorageSync('trucks', mergedTrucks);
      wx.setStorageSync('payments', mergedPayments);
      wx.setStorageSync('debts', mergedDebts);
      wx.setStorageSync('bonusRecords', mergedBonusRecords);
      if (mergedUserName && !localUserName) {
        wx.setStorageSync('userName', mergedUserName);
      }

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
      console.error('同步失败:', error);

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

    // 先添加本地数据
    localData.forEach(item => {
      mergedMap.set(item[idField], item);
    });

    // 云端数据合并，根据 updateTime 比较保留最新的
    cloudData.forEach(cloudItem => {
      const id = cloudItem[idField];
      const localItem = mergedMap.get(id);

      if (localItem) {
        // 都存在，比较更新时间
        const localTime = localItem.updateTime ? new Date(localItem.updateTime).getTime() : 0;
        const cloudTime = cloudItem.updateTime ? new Date(cloudItem.updateTime).getTime() : 0;

        if (cloudTime > localTime) {
          mergedMap.set(id, cloudItem);
        }
        // 否则保留本地数据
      } else {
        // 只有云端有，添加到本地
        mergedMap.set(id, cloudItem);
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
  }
});
