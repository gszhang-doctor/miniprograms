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
    deleteIndex: -1
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
    const presetProjects = [
      ...projectNames,
      '一期工程',
      '二期工程',
      '市政道路',
      '桥梁建设',
      '地下管网'
    ];

    // 预设工头
    const presetForemen = [
      ...foremanNames,
      '张三',
      '李四',
      '王五',
      '赵六',
      '钱七'
    ];

    // 预设工头电话
    const presetPhones = [
      ...foremanPhones
    ];

    this.setData({
      presetProjects,
      presetForemen,
      presetPhones
    });
  },

  // 项目名称输入
  onProjectNameInput(e) {
    this.setData({ projectName: e.detail.value });
  },

  // 工头输入
  onForemanInput(e) {
    this.setData({ foreman: e.detail.value });
  },

  // 工头电话输入
  onForemanPhoneInput(e) {
    this.setData({ foremanPhone: e.detail.value });
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

    showToast(this.data.isEdit ? '项目修改成功' : '项目创建成功', 'success');

    // 返回上一页
    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
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
