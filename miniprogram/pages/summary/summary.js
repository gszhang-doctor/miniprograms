// 数据汇总页面逻辑
const app = getApp();
const { formatDate, showToast } = require('../../utils/util.js');

Page({
  data: {
    projectId: '',
    projectName: '',
    stats: null,
    dailyStats: [],
    driverStats: [],
    lastDriver: '',
    paymentMethodList: []
  },

  onLoad(options) {
    const { projectId } = options;
    
    this.setData({
      projectId
    });

    this.loadSummary();
  },

  // 加载汇总数据
  loadSummary() {
    const stats = app.calculateProjectStats(this.data.projectId);

    // 处理每日统计数据
    const dailyStats = Object.entries(stats.dailyStats || {}).map(([date, data]) => {
      return {
        date,
        quantity: data.quantity.toFixed(1),
        amount: data.amount.toFixed(2),
        count: 0 // 稍后计算
      };
    }).sort((a, b) => b.date.localeCompare(a.date));

    // 计算每日车次数量
    const trucks = app.getTrucks(this.data.projectId);
    const trucksByTime = [...trucks].sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
    dailyStats.forEach(day => {
      day.count = trucks.filter(t => t.createTime.includes(day.date)).length;
    });

    // 处理司机统计数据
    const driverStatsMap = {};
    trucks.forEach(truck => {
      if (!driverStatsMap[truck.driverName]) {
        driverStatsMap[truck.driverName] = {
          quantity: 0,
          amount: 0,
          count: 0,
          pumpDriver: '',
          pumpCost: 0
        };
      }
      driverStatsMap[truck.driverName].quantity += truck.quantity;
      driverStatsMap[truck.driverName].amount += truck.quantity * truck.unitPrice + (truck.pumpCost || 0);
      driverStatsMap[truck.driverName].count += 1;

      // 记录泵车司机和费用
      if (truck.pumpDriver) {
        if (driverStatsMap[truck.driverName].pumpDriver) {
          // 如果已有多个泵车司机，用逗号分隔
          if (!driverStatsMap[truck.driverName].pumpDriver.includes(truck.pumpDriver)) {
            driverStatsMap[truck.driverName].pumpDriver += `, ${truck.pumpDriver}`;
          }
        } else {
          driverStatsMap[truck.driverName].pumpDriver = truck.pumpDriver;
        }
      }
      driverStatsMap[truck.driverName].pumpCost += truck.pumpCost || 0;
    });

    const driverStats = Object.entries(driverStatsMap).map(([name, data]) => {
      return {
        name,
        quantity: data.quantity.toFixed(1),
        amount: data.amount.toFixed(2),
        count: data.count,
        pumpDriver: data.pumpDriver,
        pumpCost: data.pumpCost.toFixed(2)
      };
    }).sort((a, b) => b.count - a.count);

    // 获取最后一次车次的司机
    const lastDriver = trucksByTime.length > 0 ? trucksByTime[0].driverName : '';

    // 处理付款方式分布
    const paymentMethodList = Object.entries(stats.paymentMethodStats || {}).map(([method, amount]) => {
      const percent = ((amount / parseFloat(stats.paidAmount)) * 100).toFixed(1);
      return {
        method,
        amount: amount.toFixed(2),
        percent
      };
    }).sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));

    this.setData({
      stats: {
        totalTrucks: stats.totalTrucks,
        totalQuantity: stats.totalQuantity.toFixed(1),
        totalAmount: stats.totalAmount.toFixed(2),
        concreteAmount: parseFloat(stats.concreteAmount).toFixed(2),
        pumpCost: parseFloat(stats.pumpCost).toFixed(2),
        paidAmount: stats.paidAmount.toFixed(2),
        unpaidAmount: stats.unpaidAmount.toFixed(2)
      },
      dailyStats,
      driverStats,
      lastDriver,
      paymentMethodList
    });
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

  // 导出数据
  exportData() {
    const { stats, dailyStats, paymentMethodList } = this.data;

    // 生成CSV数据
    let csv = '数据汇总报告\n\n';
    csv += `导出时间,${formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss')}\n\n`;
    
    // 基础统计
    csv += '基础统计\n';
    csv += '项目,数值\n';
    csv += `车次总数,${stats.totalTrucks}\n`;
    csv += `总方数,${stats.totalQuantity}方\n`;
    csv += `总金额,¥${stats.totalAmount}\n\n`;
    
    // 财务统计
    csv += '财务统计\n';
    csv += '项目,金额\n';
    csv += `已付款,¥${stats.paidAmount}\n`;
    csv += `未付款,¥${stats.unpaidAmount}\n\n`;
    
    // 每日统计
    csv += '每日统计\n';
    csv += '日期,车次数,方数,金额\n';
    dailyStats.forEach(day => {
      csv += `${day.date},${day.count},${day.quantity},¥${day.amount}\n`;
    });
    csv += '\n';
    
    // 付款方式分布
    csv += '付款方式分布\n';
    csv += '付款方式,金额,占比\n';
    paymentMethodList.forEach(item => {
      csv += `${item.method},¥${item.amount},${item.percent}%\n`;
    });

    // 复制到剪贴板
    wx.setClipboardData({
      data: csv,
      success: () => {
        showToast('数据已复制到剪贴板，可粘贴到Excel中', 'success');
      }
    });
  },

  // 分享数据
  shareData() {
    const { stats, dailyStats } = this.data;
    
    // 生成分享文本
    const shareText = `
📊 施工项目数据汇总

📦 基础统计
• 车次总数：${stats.totalTrucks} 次
• 总方数：${stats.totalQuantity} 方
• 总金额：¥${stats.totalAmount}

💰 财务统计
• 已付款：¥${stats.paidAmount}
• 未付款：¥${stats.unpaidAmount}

📅 最新数据
${dailyStats.length > 0 ? `• 最新日期：${dailyStats[0].date}` : '• 暂无数据'}
${dailyStats.length > 0 ? `• 最近方数：${dailyStats[0].quantity} 方` : ''}

导出时间：${formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss')}
    `.trim();

    // 复制分享文本
    wx.setClipboardData({
      data: shareText,
      success: () => {
        wx.showModal({
          title: '分享提示',
          content: '报告已复制到剪贴板，可以粘贴分享给相关人员',
          showCancel: false
        });
      }
    });
  }
});
