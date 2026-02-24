// 云函数入口文件
const cloud = require('wx-server-sdk');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const os = require('os');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event, context) => {
  const { projects, trucks, payments, debts } = event;

  try {
    // 创建工作簿
    const workbook = new ExcelJS.Workbook();

    // 创建工作表
    projects.forEach((project, index) => {
      // 车次工作表
      const truckSheet = workbook.addWorksheet(`${project.projectName}_车次`);
      setupTruckSheet(truckSheet, project, trucks.filter(t => t.projectId === project.projectId));

      // 付款工作表
      const paymentSheet = workbook.addWorksheet(`${project.projectName}_付款`);
      setupPaymentSheet(paymentSheet, project, payments.filter(p => p.projectId === project.projectId));

      // 欠账工作表
      const debtSheet = workbook.addWorksheet(`${project.projectName}_欠账`);
      setupDebtSheet(debtSheet, project, debts.filter(d => d.projectId === project.projectId));

      // 汇总工作表
      const summarySheet = workbook.addWorksheet(`${project.projectName}_汇总`);
      setupSummarySheet(summarySheet, project, trucks, payments);
    });

    // 生成文件
    const tempDir = os.tmpdir();
    const filePath = path.join(tempDir, `施工项目数据_${Date.now()}.xlsx`);
    await workbook.xlsx.writeFile(filePath);

    // 读取文件内容
    const fileContent = fs.readFileSync(filePath);
    const base64 = fileContent.toString('base64');

    // 删除临时文件
    fs.unlinkSync(filePath);

    return {
      errCode: 0,
      errMsg: 'success',
      data: {
        fileData: base64,
        fileName: `施工项目数据_${Date.now()}.xlsx`
      }
    };
  } catch (error) {
    console.error('生成Excel失败:', error);
    return {
      errCode: -1,
      errMsg: error.message,
      data: null
    };
  }
};

// 设置车次工作表
function setupTruckSheet(sheet, project, trucks) {
  // 合并标题单元格
  sheet.mergeCells('A1:J1');
  sheet.getCell('A1').value = `项目：${project.projectName}  |  工头：${project.foreman}  |  电话：${project.foremanPhone || '无'}  |  创建日期：${project.createDate}`;
  sheet.getCell('A1').font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1890FF' } };
  sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

  // 设置列宽
  sheet.columns = [
    { key: 'truckNo', width: 15, header: '车次编号' },
    { key: 'driverName', width: 12, header: '司机姓名' },
    { key: 'quantity', width: 10, header: '浇筑方量' },
    { key: 'unitPrice', width: 12, header: '单价' },
    { key: 'concreteCost', width: 12, header: '混凝土费用' },
    { key: 'pumpDriver', width: 12, header: '泵车司机' },
    { key: 'pumpCost', width: 12, header: '泵车费用' },
    { key: 'totalCost', width: 12, header: '总费用' },
    { key: 'constructionSite', width: 20, header: '施工地点' },
    { key: 'strengthGrade', width: 12, header: '强度等级' }
  ];

  // 表头样式
  const headerRow = sheet.getRow(2);
  headerRow.eachCell((cell, colNumber) => {
    cell.font = { size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF52C41A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // 添加数据
  trucks.forEach((truck, index) => {
    const concreteCost = truck.unitPrice * truck.quantity;
    const pumpCost = truck.pumpCost || 0;
    const totalCost = concreteCost + pumpCost;

    const row = sheet.addRow({
      truckNo: truck.truckNo,
      driverName: truck.driverName || '',
      quantity: truck.quantity,
      unitPrice: truck.unitPrice,
      concreteCost: concreteCost.toFixed(2),
      pumpDriver: truck.pumpDriver || '',
      pumpCost: pumpCost.toFixed(2),
      totalCost: totalCost.toFixed(2),
      constructionSite: truck.constructionSite || '',
      strengthGrade: truck.strengthGrade || ''
    });

    // 设置单元格样式
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
  });
}

// 设置付款工作表
function setupPaymentSheet(sheet, project, payments) {
  sheet.mergeCells('A1:E1');
  sheet.getCell('A1').value = `项目：${project.projectName}  |  付款记录`;
  sheet.getCell('A1').font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFA8C16' } };
  sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.columns = [
    { key: 'paymentDate', width: 15, header: '付款日期' },
    { key: 'paymentMethod', width: 15, header: '付款方式' },
    { key: 'amount', width: 12, header: '付款金额' },
    { key: 'remarks', width: 30, header: '备注' },
    { key: 'createTime', width: 20, header: '创建时间' }
  ];

  const headerRow = sheet.getRow(2);
  headerRow.eachCell((cell) => {
    cell.font = { size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1890FF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  payments.forEach((payment) => {
    const row = sheet.addRow(payment);
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
  });
}

// 设置欠账工作表
function setupDebtSheet(sheet, project, debts) {
  sheet.mergeCells('A1:G1');
  sheet.getCell('A1').value = `项目：${project.projectName}  |  欠账记录`;
  sheet.getCell('A1').font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF4D4F' } };
  sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.columns = [
    { key: 'debtorName', width: 15, header: '欠款人' },
    { key: 'debtorPhone', width: 15, header: '电话' },
    { key: 'debtAmount', width: 12, header: '欠款金额' },
    { key: 'dueDate', width: 15, header: '约定结清时间' },
    { key: 'responsiblePerson', width: 15, header: '站内负责人' },
    { key: 'isSettled', width: 10, header: '状态' },
    { key: 'createTime', width: 20, header: '创建时间' }
  ];

  const headerRow = sheet.getRow(2);
  headerRow.eachCell((cell) => {
    cell.font = { size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1890FF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  debts.forEach((debt) => {
    const row = sheet.addRow({
      ...debt,
      isSettled: debt.isSettled ? '已结清' : '未结清'
    });
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
  });
}

// 设置汇总工作表
function setupSummarySheet(sheet, project, allTrucks, allPayments) {
  sheet.mergeCells('A1:G1');
  sheet.getCell('A1').value = `项目：${project.projectName}  |  汇总信息`;
  sheet.getCell('A1').font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF722ED1' } };
  sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

  const projectTrucks = allTrucks.filter(t => t.projectId === project.projectId);
  const projectPayments = allPayments.filter(p => p.projectId === project.projectId);

  let totalQuantity = 0;
  let concreteAmount = 0;
  let pumpCost = 0;
  let totalAmount = 0;

  projectTrucks.forEach(truck => {
    totalQuantity += truck.quantity;
    const truckConcreteCost = truck.quantity * truck.unitPrice;
    const truckPumpCost = truck.pumpCost || 0;
    concreteAmount += truckConcreteCost;
    pumpCost += truckPumpCost;
    totalAmount += truckConcreteCost + truckPumpCost;
  });

  let paidAmount = 0;
  projectPayments.forEach(payment => {
    paidAmount += payment.amount;
  });

  const unpaidAmount = totalAmount - paidAmount;
  const progress = totalAmount > 0 ? ((paidAmount / totalAmount) * 100).toFixed(1) : 0;

  // 汇总数据
  const summaryData = [
    { label: '基本信息', value: '' },
    { label: '工头姓名', value: project.foreman },
    { label: '工头电话', value: project.foremanPhone || '无' },
    { label: '创建日期', value: project.createDate },
    { label: '车次统计', value: '' },
    { label: '总车次', value: projectTrucks.length },
    { label: '总方数', value: totalQuantity },
    { label: '费用统计', value: '' },
    { label: '混凝土费用', value: `${concreteAmount.toFixed(2)} 元` },
    { label: '泵车费用', value: `${pumpCost.toFixed(2)} 元` },
    { label: '总金额', value: `${totalAmount.toFixed(2)} 元` },
    { label: '付款统计', value: '' },
    { label: '已付款', value: `${paidAmount.toFixed(2)} 元` },
    { label: '未付款', value: `${unpaidAmount.toFixed(2)} 元` },
    { label: '付款进度', value: `${progress}%` }
  ];

  sheet.addRow(['项目', '数值']);
  sheet.addRow(['', '']);
  summaryData.forEach(item => {
    sheet.addRow([item.label, item.value]);
  });

  // 样式设置
  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
    });
  });
}
