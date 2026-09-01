// 创建项目页面逻辑
const app = getApp();
const { formatDate, validateRequired, showToast } = require('../../utils/util.js');

Page({
  data: {
    projectId: '',
    isEdit: false,
    projectName: '',
    foreman: '',
    foremanPhone: '',
    createDate: '',
    remarks: '',
    presetProjects: [],
    presetForemen: [],
    presetPhones: [],
    minDate: '',
    maxDate: '',
    showDeletePreset: false,
    deleteType: '',
    deleteIndex: -1,
    foremanPhoneMap: {} // 工头-电话映射数据
  },

  onLoad(options) {
    const { projectId } = options;

    // 设置默认日期为今天
    const today = formatDate(new Date());

    // 设置日期范围（过去30天到未来30天）
    const minDate = formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const maxDate = formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

    this.setData({
      projectId: projectId || '',
      isEdit: !!projectId,
      createDate: today,
      minDate,
      maxDate
    });

    // 如果是编辑模式，加载项目数据
    if (projectId) {
      this.loadProjectData(projectId);
    } else {
      // 新建模式：加载预设数据
      this.loadPresetData();
    }
  },

  // 加载项目数据（编辑模式）
  loadProjectData(projectId) {
    const projects = app.getProjects();
    const project = projects.find(p => p.projectId === projectId);

    if (project) {
      this.setData({
        projectName: project.projectName,
        foreman: project.foreman,
        foremanPhone: project.foremanPhone,
        createDate: project.createDate,
        remarks: project.remarks || ''
      });
    }
  },

  // 加载预设数据
  loadPresetData() {
    const projects = app.getProjects();

    // 提取历史项目名称和工头
    const projectNames = [...new Set(projects.map(p => p.projectName))];
    const foremanNames = [...new Set(projects.map(p => p.foreman))];
    const foremanPhones = [...new Set(projects.map(p => p.foremanPhone).filter(p => p))];

    // 预设项目
    const presetProjects = app.getPresetList('project', [
      '一期工程',
      '二期工程',
      '市政道路',
      '桥梁建设',
      '地下管网'
    ], projectNames);

    // 预设工头
    const presetForemen = app.getPresetList('foreman', [
      '张三',
      '李四',
      '王五',
      '赵六',
      '钱七'
    ], foremanNames);

    // 预设工头电话
    const presetPhones = app.getPresetList('phone', [], foremanPhones);

    // 加载工头-电话映射数据，并从历史项目中提取
    let foremanPhoneMap = this.loadForemanPhoneMap();

    // 如果映射数据为空，从历史项目中提取工头-电话对应关系
    if (!foremanPhoneMap || Object.keys(foremanPhoneMap).length === 0) {
      console.log('工头-电话映射数据为空，从历史项目中提取...');
      foremanPhoneMap = this.extractForemanPhoneFromProjects(projects);
      this.saveForemanPhoneMap(foremanPhoneMap);
    }

    // 调试信息
    console.log('=== 加载预设数据 ===');
    console.log('工头-电话映射数据:', foremanPhoneMap);
    console.log('是否包含苏伟:', foremanPhoneMap['苏伟']);

    this.setData({
      presetProjects,
      presetForemen,
      presetPhones,
      foremanPhoneMap
    });
  },

  // 从历史项目中提取工头-电话对应关系
  extractForemanPhoneFromProjects(projects) {
    const foremanPhoneMap = {};

    projects.forEach(project => {
      const foreman = project.foreman;
      const phone = project.foremanPhone;

      if (foreman && phone) {
        // 如果工头已存在，检查电话是否重复
        if (!foremanPhoneMap[foreman]) {
          foremanPhoneMap[foreman] = []; // 初始化电话数组
        }

        // 确保是数组格式
        if (!Array.isArray(foremanPhoneMap[foreman])) {
          foremanPhoneMap[foreman] = [foremanPhoneMap[foreman]];
        }

        // 添加电话（避免重复）
        if (!foremanPhoneMap[foreman].includes(phone)) {
          foremanPhoneMap[foreman].push(phone);
        }
      }
    });

    console.log('从历史项目提取的工头-电话映射:', foremanPhoneMap);
    return foremanPhoneMap;
  },

  // 加载工头-电话映射数据
  loadForemanPhoneMap() {
    try {
      const mapData = wx.getStorageSync('foremanPhoneMap') || '{}';
      return JSON.parse(mapData);
    } catch (error) {
      console.error('加载工头-电话映射失败:', error);
      return {};
    }
  },

  // 保存工头-电话映射数据
  saveForemanPhoneMap(foremanPhoneMap) {
    try {
      wx.setStorageSync('foremanPhoneMap', JSON.stringify(foremanPhoneMap));
    } catch (error) {
      console.error('保存工头-电话映射失败:', error);
    }
  },

  // 显示工头电话选择弹窗（当工头有多个电话时）
  showForemanPhoneSelector(foreman) {
    const foremanPhoneMap = this.data.foremanPhoneMap || {};
    const phones = foremanPhoneMap[foreman];

    if (!phones || phones.length === 0) {
      return; // 没有电话记录
    }

    if (phones.length === 1) {
      // 只有一个电话，直接填充
      this.setData({ foremanPhone: phones[0] });
      return;
    }

    // 多个电话，显示选择弹窗
    const phoneOptions = phones.map(phone => ({
      text: phone,
      value: phone
    }));

    wx.showActionSheet({
      itemList: phones,
      success: (res) => {
        if (res.tapIndex >= 0) {
          const selectedPhone = phones[res.tapIndex];
          this.setData({ foremanPhone: selectedPhone });
        }
      }
    });
  },

  // 项目名称输入
  onProjectNameInput(e) {
    this.setData({ projectName: e.detail.value });
  },

  // 工头输入
  onForemanInput(e) {
    const foreman = e.detail.value;
    this.setData({ foreman });

    // 调试信息
    console.log('工头输入:', foreman);
    console.log('工头-电话映射数据:', this.data.foremanPhoneMap);

    // 检查是否有对应的电话记录
    const foremanPhoneMap = this.data.foremanPhoneMap || {};
    if (foreman && foremanPhoneMap[foreman]) {
      console.log('找到工头电话记录:', foremanPhoneMap[foreman]);
      const phones = foremanPhoneMap[foreman];
      if (Array.isArray(phones)) {
        // 多个电话，显示选择弹窗
        if (phones.length === 1) {
          // 只有一个电话，直接填充
          console.log('单个电话，直接填充:', phones[0]);
          this.setData({ foremanPhone: phones[0] });
        } else {
          // 多个电话，延迟显示选择弹窗避免输入时频繁弹出
          console.log('多个电话，延迟显示选择弹窗:', phones);
          clearTimeout(this.phoneSelectorTimer);
          this.phoneSelectorTimer = setTimeout(() => {
            this.showForemanPhoneSelector(foreman);
          }, 500);
        }
      } else {
        // 兼容旧格式，单个电话直接填充
        console.log('旧格式，直接填充:', phones);
        this.setData({ foremanPhone: phones });
      }
    } else {
      console.log('未找到工头电话记录:', foreman);
    }
  },

  // 工头电话输入
  onForemanPhoneInput(e) {
    const phone = e.detail.value;
    this.setData({ foremanPhone: phone });
  },

  // 选择预设项目
  selectPresetProject(e) {
    const name = e.currentTarget.dataset.name;
    this.setData({ projectName: name });
  },

  // 选择预设工头
  selectPresetForeman(e) {
    if (this.data.showDeletePreset) return;
    const name = e.currentTarget.dataset.name;
    this.setData({ foreman: name });

    // 调试信息
    console.log('选择预设工头:', name);
    console.log('工头-电话映射数据:', this.data.foremanPhoneMap);

    // 自动填充对应的电话
    const foremanPhoneMap = this.data.foremanPhoneMap || {};
    if (name && foremanPhoneMap[name]) {
      console.log('找到工头电话记录:', foremanPhoneMap[name]);
      const phones = foremanPhoneMap[name];
      if (Array.isArray(phones)) {
        if (phones.length === 1) {
          // 只有一个电话，直接填充
          console.log('单个电话，直接填充:', phones[0]);
          this.setData({ foremanPhone: phones[0] });
        } else {
          // 多个电话，显示选择弹窗
          console.log('多个电话，显示选择弹窗:', phones);
          this.showForemanPhoneSelector(name);
        }
      } else {
        // 兼容旧格式，单个电话直接填充
        console.log('旧格式，直接填充:', phones);
        this.setData({ foremanPhone: phones });
      }
    } else {
      console.log('未找到工头电话记录:', name);
    }
  },

  // 选择预设工头电话
  selectPresetPhone(e) {
    if (this.data.showDeletePreset) return;
    const phone = e.currentTarget.dataset.phone;
    this.setData({ foremanPhone: phone });
  },

  // 日期选择
  onDateChange(e) {
    this.setData({ createDate: e.detail.value });
  },

  // 备注输入
  onRemarksInput(e) {
    this.setData({ remarks: e.detail.value });
  },

  // 取消创建
  onCancel() {
    wx.navigateBack();
  },

  // 确认创建/编辑
  onConfirm() {
    // 验证必填项
    if (!validateRequired(this.data.projectName, '项目名称')) return;
    if (!validateRequired(this.data.foreman, '工头姓名')) return;
    if (!validateRequired(this.data.foremanPhone, '工头电话')) return;
    if (!validateRequired(this.data.createDate, '创建日期')) return;

    // 验证电话号码格式
    const phoneReg = /^1[3-9]\d{9}$/;
    if (!phoneReg.test(this.data.foremanPhone)) {
      showToast('请输入正确的手机号码');
      return;
    }

    // 创建/更新项目对象
    const creator = app.getUserName() || '';
    const project = {
      projectId: this.data.projectId || app.generateId('project'),
      projectName: this.data.projectName,
      foreman: this.data.foreman,
      foremanPhone: this.data.foremanPhone,
      createDate: this.data.createDate,
      createTime: this.data.isEdit ? this.getProjectCreateTime(this.data.projectId) : formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss'),
      remarks: this.data.remarks,
      totalTrucks: 0,
      creator: creator,
      updateTime: new Date().toISOString()
    };

    // 保存项目
    app.saveProject(project);
    app.addPresetValue('project', project.projectName);
    app.addPresetValue('foreman', project.foreman);
    app.addPresetValue('phone', project.foremanPhone);

    // 保存工头-电话映射关系
    this.saveForemanPhoneMapping(this.data.foreman, this.data.foremanPhone);

    showToast(this.data.isEdit ? '项目修改成功' : '项目创建成功', 'success');

    // 返回上一页
    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  },

  // 保存工头-电话映射关系
  saveForemanPhoneMapping(foreman, phone) {
    if (!foreman || !phone) return;

    try {
      const mapData = wx.getStorageSync('foremanPhoneMap') || '{}';
      const foremanPhoneMap = JSON.parse(mapData);

      // 获取现有电话列表
      let phones = foremanPhoneMap[foreman] || [];

      // 兼容旧格式，如果不是数组则转换为数组
      if (!Array.isArray(phones)) {
        phones = [phones];
      }

      // 检查电话是否已存在
      if (!phones.includes(phone)) {
        // 添加新电话到列表
        phones.push(phone);

        // 限制最多保存5个电话（避免数据过大）
        if (phones.length > 5) {
          phones = phones.slice(-5); // 保留最近的5个
        }

        // 更新映射关系
        foremanPhoneMap[foreman] = phones;

        // 保存到本地存储
        wx.setStorageSync('foremanPhoneMap', JSON.stringify(foremanPhoneMap));
        console.log('工头-电话映射已保存:', foreman, '->', phones);
      } else {
        console.log('工头电话已存在，无需重复保存:', foreman, '->', phone);
      }
    } catch (error) {
      console.error('保存工头-电话映射失败:', error);
    }
  },

  // 获取项目创建时间（编辑模式需要保留）
  getProjectCreateTime(projectId) {
    const projects = app.getProjects();
    const project = projects.find(p => p.projectId === projectId);
    return project ? project.createTime : formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss');
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
            case 'project':
              key = 'presetProjects';
              break;
            case 'foreman':
              key = 'presetForemen';
              break;
            case 'phone':
              key = 'presetPhones';
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
  },

  // 页面卸载时清除定时器
  onUnload() {
    if (this.phoneSelectorTimer) {
      clearTimeout(this.phoneSelectorTimer);
      this.phoneSelectorTimer = null;
    }
  }
});
