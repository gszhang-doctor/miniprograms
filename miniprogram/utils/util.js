// 格式化日期
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

// 格式化金额
const formatMoney = (amount, decimals = 2) => {
  return Number(amount).toFixed(decimals);
};

// 显示提示
const showToast = (title, icon = 'none') => {
  wx.showToast({
    title,
    icon,
    duration: 2000
  });
};

// 显示确认弹窗
const showConfirm = (content, title = '提示') => {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      success: (res) => {
        resolve(res.confirm);
      },
      fail: () => {
        resolve(false);
      }
    });
  });
};

// 验证车牌号
const validateLicensePlate = (plate) => {
  const reg = /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领A-Z]{1}[A-Z]{1}[A-Z0-9]{4}[A-Z0-9挂学警港澳]{1}$/;
  return reg.test(plate);
};

// 验证必填项
const validateRequired = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    showToast(`${fieldName}不能为空`);
    return false;
  }
  if (typeof value === 'string' && value.trim() === '') {
    showToast(`${fieldName}不能为空`);
    return false;
  }
  return true;
};

// 导出Excel数据
const exportToExcel = (data, filename) => {
  // 将数据转换为CSV格式
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => Object.values(row).join(','));
  const csv = [headers, ...rows].join('\n');
  
  return csv;
};

module.exports = {
  formatDate,
  formatMoney,
  showToast,
  showConfirm,
  validateLicensePlate,
  validateRequired,
  exportToExcel
};
