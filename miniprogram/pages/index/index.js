// 主页面逻辑
const app = getApp();
const { formatDate, showToast } = require('../../utils/util.js');

Page({
  data: {
    projects: [],
    filteredProjects: [],
    filterDate: '',
    filterProject: '',
    filterForeman: '',
    filterPayment: '',
    projectNames: [],
    foremanNames: []
  },

  onLoad() {
    this.loadProjects();
    // 确保自动上传默认开启
    if (!app.getAutoUploadStatus()) {
      app.setAutoUpload(true);
    }
  },

  onShow() {
    this.loadProjects();
  },

  // 下拉刷新
  onPullDownRefresh() {
    // 先上传本地数据到云端
    app.uploadToCloud(true).then(() => {
      // 上传成功后，再从云端同步数据（智能合并）
      return app.syncFromCloud(true);
    }).then(() => {
      // 刷新项目列表
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

  // 加载项目列表
  loadProjects() {
    let projects = app.getProjects();

    // 先按创建日期倒序，日期相同再按创建时间倒序
    projects.sort((a, b) => {
      const dateA = a.createDate || '';
      const dateB = b.createDate || '';

      // 如果都没有创建日期，保持原顺序
      if (!dateA && !dateB) return 0;
      // 如果A没有创建日期，B有日期，B排在前面
      if (!dateA) return 1;
      // 如果A有日期，B没有日期，A排在前面
      if (!dateB) return -1;

      // 先比较创建日期，倒序
      const dateCompare = dateB.localeCompare(dateA);
      if (dateCompare !== 0) {
        return dateCompare;
      }

      // 创建日期相同，再比较创建时间，倒序
      const timeA = a.createTime || '';
      const timeB = b.createTime || '';

      if (!timeA && !timeB) return 0;
      if (!timeA) return 1;
      if (!timeB) return -1;

      const timeDateA = new Date(timeA);
      const timeDateB = new Date(timeB);
      return timeDateB - timeDateA;
    });

    // 为每个项目计算统计数据
    const projectsWithStats = projects.map(project => {
      // 特别检查高井培华项目
      if (project.projectId === 'project_1772859240727_744') {
        console.log('=== 页面加载时高井培华项目检查 ===');
        console.log('项目ID:', project.projectId);
        console.log('项目名称:', project.projectName);
        console.log('项目存储的车次数量:', project.totalTrucks);

        // 重新计算车次数量
        const trucks = app.getTrucks(project.projectId);
        console.log('重新计算的车次数量:', trucks.length);
        console.log('车次详情:', trucks.map(t => ({truckId: t.truckId, driverName: t.driverName})));
      }

      const stats = app.calculateProjectStats(project.projectId);

      // 确保使用重新计算的统计数据，而不是本地存储的字段
      return {
        ...project,
        totalTrucks: stats.totalTrucks,  // 强制使用重新计算的结果
        totalQuantity: stats.totalQuantity,
        totalAmount: stats.totalAmount,
        concreteAmount: stats.concreteAmount,
        pumpCost: stats.pumpCost,
        paidAmount: stats.paidAmount,
        unpaidAmount: stats.unpaidAmount,
        stats
      };
    });

    // 收集项目名称和工头名称用于筛选
    const projectNames = [...new Set(projects.map(p => p.projectName))];
    const foremanNames = [...new Set(projects.map(p => p.foreman))];

    this.setData({
      projects: projectsWithStats,
      filteredProjects: projectsWithStats,
      projectNames,
      foremanNames
    });

    this.applyFilters();
  },

  // 应用筛选条件
  applyFilters() {
    let filtered = [...this.data.projects];

    // 按日期筛选
    if (this.data.filterDate) {
      filtered = filtered.filter(p => p.createDate === this.data.filterDate);
    }

    // 按项目名称筛选
    if (this.data.filterProject) {
      filtered = filtered.filter(p => p.projectName === this.data.filterProject);
    }

    // 按工头筛选
    if (this.data.filterForeman) {
      filtered = filtered.filter(p => p.foreman === this.data.filterForeman);
    }

    // 按支付状态筛选
    if (this.data.filterPayment) {
      filtered = filtered.filter(p => {
        if (!p.stats) return false;
        if (this.data.filterPayment === '已付清') {
          return p.stats.isPaidOff;
        } else if (this.data.filterPayment === '未付清') {
          return !p.stats.isPaidOff && p.stats.totalAmount > 0;
        }
        return true;
      });
    }

    this.setData({ filteredProjects: filtered });
  },

  // 联系工头
  callForeman(e) {
    const phone = e.currentTarget.dataset.phone;
    if (!phone) {
      showToast('暂无工头电话');
      return;
    }

    wx.showModal({
      title: '拨打电话',
      content: `确定要拨打 ${phone} 吗？`,
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
  },

  // 显示日期筛选
  showDateFilter() {
    wx.showActionSheet({
      itemList: ['全部', ...this.getUniqueDates()],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.setData({ filterDate: '' });
        } else {
          this.setData({ filterDate: this.getUniqueDates()[res.tapIndex - 1] });
        }
        this.applyFilters();
      }
    });
  },

  // 获取所有唯一日期
  getUniqueDates() {
    const dates = this.data.projects.map(p => p.createDate);
    return [...new Set(dates)].sort((a, b) => b.localeCompare(a));
  },

  // 显示项目筛选
  showProjectFilter() {
    wx.showActionSheet({
      itemList: ['全部', ...this.data.projectNames],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.setData({ filterProject: '' });
        } else {
          this.setData({ filterProject: this.data.projectNames[res.tapIndex - 1] });
        }
        this.applyFilters();
      }
    });
  },

  // 显示工头筛选
  showForemanFilter() {
    wx.showActionSheet({
      itemList: ['全部', ...this.data.foremanNames],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.setData({ filterForeman: '' });
        } else {
          this.setData({ filterForeman: this.data.foremanNames[res.tapIndex - 1] });
        }
        this.applyFilters();
      }
    });
  },

  // 显示支付状态筛选
  showPaymentFilter() {
    wx.showActionSheet({
      itemList: ['全部', '已付清', '未付清'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.setData({ filterPayment: '' });
        } else {
          this.setData({ filterPayment: ['已付清', '未付清'][res.tapIndex - 1] });
        }
        this.applyFilters();
      }
    });
  },

  // 查看项目详情（进入车次列表）
  viewProjectDetail(e) {
    const project = e.currentTarget.dataset.project;
    wx.navigateTo({
      url: `/pages/truck-list/truck-list?projectId=${project.projectId}&projectName=${project.projectName}`
    });
  },

  // 长按卡片弹出编辑删除菜单
  handleCardLongPress(e) {
    const project = e.currentTarget.dataset.project;
    wx.showActionSheet({
      itemList: ['编辑项目', '删除项目'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 编辑项目
          this.editProjectWithCard(project);
        } else if (res.tapIndex === 1) {
          // 删除项目
          this.deleteProjectWithConfirm(project);
        }
      }
    });
  },

  // 编辑项目（从长按菜单触发）
  editProjectWithCard(project) {
    wx.navigateTo({
      url: `/pages/project-create/project-create?projectId=${project.projectId}`
    });
  },

  // 删除项目（从长按菜单触发，需要两次确认）
  deleteProjectWithConfirm(project) {
    const projectId = project.projectId;
    const projectName = project.projectName;

    // 第一次确认
    wx.showModal({
      title: '删除确认',
      content: `确定要删除项目「${projectName}」吗？`,
      confirmColor: '#ff4d4f',
      success: (res1) => {
        if (res1.confirm) {
          // 第二次确认
          wx.showModal({
            title: '再次确认',
            content: `删除后将同时删除所有关联的车次、付款和欠账记录，此操作不可恢复！\n\n请再次确认删除「${projectName}」？`,
            confirmText: '确认删除',
            confirmColor: '#ff4d4f',
            success: (res2) => {
              if (res2.confirm) {
                app.deleteProject(projectId);
                showToast('项目已删除', 'success');
                this.loadProjects();
              }
            }
          });
        }
      }
    });
  },

  // 创建新项目
  createProject() {
    wx.navigateTo({
      url: '/pages/project-create/project-create'
    });
  },

  // 进入付款页面
  goToPayment(e) {
    const projectId = e.currentTarget.dataset.projectId;
    wx.navigateTo({
      url: `/pages/payment-list/payment-list?projectId=${projectId}`
    });
  },

  // 进入欠账页面
  goToDebt(e) {
    const projectId = e.currentTarget.dataset.projectId;
    wx.navigateTo({
      url: `/pages/debt-list/debt-list?projectId=${projectId}`
    });
  },

  // 进入汇总页面
  goToSummary(e) {
    const projectId = e.currentTarget.dataset.projectId;
    wx.navigateTo({
      url: `/pages/summary/summary?projectId=${projectId}`
    });
  },

  // 导出数据为Excel
  exportCsv() {
    const projects = app.getProjects();
    const trucks = wx.getStorageSync('trucks') || [];
    const payments = wx.getStorageSync('payments') || [];
    const debts = wx.getStorageSync('debts') || [];
    if (!projects.length && !trucks.length && !payments.length && !debts.length) {
      showToast('暂无数据可导出');
      return;
    }

    const escape = value => {
      const text = value === undefined || value === null ? '' : String(value);
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const rows = [['数据类型', '项目名称', '日期/时间', '车次编号', '姓名', '电话', '方数', '单价', '混凝土费用', '泵车司机', '泵车费用', '金额', '状态', '施工部位', '强度等级', '负责人', '备注', '创建者']];
    const projectMap = {};
    projects.forEach(project => {
      projectMap[project.projectId] = project;
      rows.push(['项目', project.projectName, project.createDate, '', project.foreman, project.foremanPhone, '', '', '', '', '', '', '', '', '', '', project.remarks || '', project.creator || '']);
    });
    trucks.forEach(truck => {
      const project = projectMap[truck.projectId] || {};
      const concrete = (parseFloat(truck.quantity) || 0) * (parseFloat(truck.unitPrice) || 0);
      rows.push(['车次', project.projectName || '', truck.createTime || '', truck.truckNo || '', truck.driverName || '', truck.licensePlate || '', truck.quantity || '', truck.unitPrice || '', concrete.toFixed(2), truck.pumpDriver || '', truck.pumpCost || 0, (concrete + (parseFloat(truck.pumpCost) || 0)).toFixed(2), '', truck.constructionSite || '', truck.strengthGrade || '', '', truck.remarks || '', truck.creator || '']);
    });
    payments.forEach(payment => {
      const project = projectMap[payment.projectId] || {};
      rows.push(['付款', project.projectName || '', payment.paymentDate || payment.createTime || '', '', '', '', '', '', '', '', '', payment.amount || 0, payment.paymentMethod || '', '', '', '', payment.remarks || '', payment.creator || '']);
    });
    debts.forEach(debt => {
      const project = projectMap[debt.projectId] || {};
      rows.push(['欠账', project.projectName || '', debt.debtDate || debt.createTime || '', '', debt.name || '', debt.phone || '', '', '', '', '', '', debt.amount || 0, debt.isSettled ? '已结清' : '未结清', '', '', debt.manager || '', debt.remarks || '', debt.creator || '']);
    });
    const csv = '\ufeff' + rows.map(row => row.map(escape).join(',')).join('\n');
    const fileName = `施工项目数据_${formatDate(new Date(), 'YYYYMMDD_HHmmss')}.csv`;
    try {
      const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
      wx.getFileSystemManager().writeFileSync(filePath, csv, 'utf8');
      wx.openDocument({ filePath, fileType: 'csv', showMenu: true,
        success: () => showToast('CSV导出成功', 'success'),
        fail: () => wx.setClipboardData({ data: csv, success: () => showToast('CSV已复制到剪贴板', 'success') })
      });
    } catch (error) {
      wx.setClipboardData({ data: csv, success: () => showToast('CSV已复制到剪贴板', 'success') });
    }
  },

  exportData() {
    const projects = app.getProjects();
    if (projects.length === 0) {
      showToast('暂无数据可导出');
      return;
    }

    wx.showLoading({ title: '正在生成Excel...' });

    // 收集所有数据
    const trucks = wx.getStorageSync('trucks') || [];
    const payments = wx.getStorageSync('payments') || [];
    const debts = wx.getStorageSync('debts') || [];

    // 调用云函数生成Excel
    wx.cloud.callFunction({
      name: 'exportExcel',
      data: {
        projects: projects,
        trucks: trucks,
        payments: payments,
        debts: debts
      }
    }).then(res => {
      wx.hideLoading();

      if (res.result.errCode === 0) {
        const { fileData, fileName } = res.result.data;

        // 将base64数据保存为文件
        const fs = wx.getFileSystemManager();
        const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;

        try {
          fs.writeFileSync(filePath, fileData, 'base64');

          // 打开文件
          wx.openDocument({
            filePath: filePath,
            fileType: 'xlsx',
            showMenu: true,
            success: function() {
              wx.showToast({
                title: '导出成功',
                icon: 'success'
              });
            },
            fail: function(err) {
              console.error('打开文件失败:', err);
              wx.showModal({
                title: '提示',
                content: 'Excel文件已生成，但无法直接打开。\n\n您可以通过"分享"功能将文件发送到电脑或其他应用中查看。',
                showCancel: false
              });
            }
          });
        } catch (error) {
          console.error('保存文件失败:', error);
          showToast('保存文件失败');
        }
      } else {
        wx.showModal({
          title: '导出失败',
          content: res.result.errMsg || '未知错误',
          showCancel: false
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('调用云函数失败:', err);
      wx.showModal({
        title: '导出失败',
        content: '云函数调用失败，请检查网络连接或云函数配置。',
        showCancel: false
      });
    });
  },

  // 上传到云数据库
  uploadToCloud() {
    wx.showModal({
      title: '上传确认',
      content: '即将上传所有数据到云数据库，是否继续？',
      confirmColor: '#1890FF',
      success: (res) => {
        if (res.confirm) {
          app.uploadToCloud().then(result => {
            if (result.success) {
              this.loadProjects();
            }
          });
        }
      }
    });
  },

  // 从云数据库下载
  downloadFromCloud() {
    wx.showModal({
      title: '下载确认',
      content: '即将从云数据库下载数据，会覆盖本地数据，是否继续？',
      confirmColor: '#1890FF',
      success: (res) => {
        if (res.confirm) {
          app.downloadFromCloud().then(result => {
            if (result.success) {
              this.loadProjects();
            }
          });
        }
      }
    });
  },

  // 切换自动上传
  toggleAutoUpload() {
    const newStatus = !this.data.autoUploadEnabled;
    app.setAutoUpload(newStatus);
    this.setData({ autoUploadEnabled: newStatus });

    wx.showToast({
      title: newStatus ? '已开启自动上传' : '已关闭自动上传',
      icon: 'success'
    });
  },

  // 导入数据
  importData() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['csv', 'xls', 'xlsx'],
      success: (res) => {
        const filePath = res.tempFiles[0].path;
        const fileName = res.tempFiles[0].name;

        wx.showModal({
          title: '导入确认',
          content: `即将导入文件: ${fileName}\n\n注意: 导入会覆盖当前数据，请确认是否继续？`,
          confirmColor: '#ff4d4f',
          success: (modalRes) => {
            if (modalRes.confirm) {
              this.processImportFile(filePath);
            }
          }
        });
      }
    });
  },

  // 处理导入文件
  processImportFile(filePath) {
    wx.showLoading({ title: '导入中...' });

    const fs = wx.getFileSystemManager();
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');

      // 简单解析CSV文件
      // 注意: 这里只支持基础的CSV格式，复杂的Excel文件需要使用第三方库
      this.parseCSVAndImport(fileContent);
    } catch (error) {
      wx.hideLoading();
      showToast('文件读取失败，请检查文件格式');
      console.error('导入失败:', error);
    }
  },

  // 解析CSV并导入数据
  parseCSVAndImport(csvContent) {
    try {
      // 清空现有数据
      wx.setStorageSync('projects', []);
      wx.setStorageSync('trucks', []);
      wx.setStorageSync('payments', []);
      wx.setStorageSync('debts', []);

      // 简单解析 - 将内容按项目分割
      const sections = csvContent.split('=== 项目');

      let projectCount = 0;

      for (let i = 1; i < sections.length; i++) {
        const section = sections[i];
        if (!section.trim()) continue;

        // 提取项目名称和基本信息
        const firstLine = section.split('\n')[0];
        const projectNameMatch = firstLine.match(/(\d+): (.+) ===/);
        if (!projectNameMatch) continue;

        const projectName = projectNameMatch[2].trim();
        const projectId = 'project_' + Date.now() + '_' + i;

        // 解析项目基本信息行
        const infoLine = section.split('\n')[1] || '';
        const infoParts = infoLine.split(',');
        let foreman = '', foremanPhone = '', createDate = '';

        infoParts.forEach(part => {
          const [key, value] = part.split(':');
          if (key === '工头') foreman = value || '';
          if (key === '电话') foremanPhone = value || '';
          if (key === '创建日期') createDate = value || '';
        });

        // 创建项目
        const project = {
          projectId,
          projectName,
          foreman,
          foremanPhone,
          createDate: createDate || formatDate(new Date()),
          createTime: new Date().toISOString()
        };

        const projects = app.getProjects();
        projects.push(project);
        wx.setStorageSync('projects', projects);

        // 解析车次记录
        const truckSection = this.extractSection(section, '【车次记录】');
        const trucks = this.parseTruckSection(truckSection, projectId);
        const allTrucks = app.getTrucks();
        allTrucks.push(...trucks);
        wx.setStorageSync('trucks', allTrucks);

        // 解析付款记录
        const paymentSection = this.extractSection(section, '【付款记录】');
        const payments = this.parsePaymentSection(paymentSection, projectId);
        const allPayments = app.getPayments();
        allPayments.push(...payments);
        wx.setStorageSync('payments', allPayments);

        // 解析欠账记录
        const debtSection = this.extractSection(section, '【欠账记录】');
        const debts = this.parseDebtSection(debtSection, projectId);
        const allDebts = app.getDebts();
        allDebts.push(...debts);
        wx.setStorageSync('debts', allDebts);

        projectCount++;
      }

      wx.hideLoading();
      showToast(`成功导入 ${projectCount} 个项目`, 'success');
      this.loadProjects();
    } catch (error) {
      wx.hideLoading();
      showToast('数据解析失败，请检查文件格式');
      console.error('解析失败:', error);
    }
  },

  // 提取数据段
  extractSection(content, sectionTitle) {
    const startIndex = content.indexOf(sectionTitle);
    if (startIndex === -1) return '';

    const endIndex = content.indexOf('【', startIndex + 1);
    return endIndex === -1 ? content.substring(startIndex) : content.substring(startIndex, endIndex);
  },

  // 解析车次段
  parseTruckSection(section, projectId) {
    const lines = section.split('\n').filter(line => line.trim() && !line.startsWith('【'));
    const trucks = [];
    let skipHeader = true;

    lines.forEach(line => {
      if (skipHeader) {
        skipHeader = false;
        return;
      }

      const parts = line.split(',');
      if (parts.length >= 3) {
        trucks.push({
          truckId: 'truck_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
          projectId,
          truckNo: parts[0] || '',
          driverName: parts[1] || '',
          quantity: parseFloat(parts[2]) || 0,
          pumpCost: parseFloat(parts[3]) || 0,
          unitPrice: parseFloat(parts[4]) / (parseFloat(parts[2]) || 1) || 0,
          constructionSite: parts[5] || '',
          strengthGrade: parts[6] || '',
          pumpDriver: parts[7] || '',
          createTime: parts[8] || new Date().toISOString()
        });
      }
    });

    return trucks;
  },

  // 解析付款段
  parsePaymentSection(section, projectId) {
    const lines = section.split('\n').filter(line => line.trim() && !line.startsWith('【'));
    const payments = [];
    let skipHeader = true;

    lines.forEach(line => {
      if (skipHeader) {
        skipHeader = false;
        return;
      }

      const parts = line.split(',');
      if (parts.length >= 2) {
        payments.push({
          paymentId: 'payment_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
          projectId,
          paymentDate: parts[0] || '',
          paymentMethod: parts[1] || '',
          amount: parseFloat(parts[2]) || 0,
          remarks: parts[3] || '',
          createTime: parts[4] || new Date().toISOString()
        });
      }
    });

    return payments;
  },

  // 解析欠账段
  parseDebtSection(section, projectId) {
    const lines = section.split('\n').filter(line => line.trim() && !line.startsWith('【'));
    const debts = [];
    let skipHeader = true;

    lines.forEach(line => {
      if (skipHeader) {
        skipHeader = false;
        return;
      }

      const parts = line.split(',');
      if (parts.length >= 2) {
        debts.push({
          debtId: 'debt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
          projectId,
          debtorName: parts[0] || '',
          debtorPhone: parts[1] || '',
          debtAmount: parseFloat(parts[2]) || 0,
          dueDate: parts[3] || '',
          responsiblePerson: parts[4] || '',
          createTime: parts[5] || new Date().toISOString()
        });
      }
    });

    return debts;
  }
});
