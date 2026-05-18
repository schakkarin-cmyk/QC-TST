// ============================================================
// QC-TST — Google Apps Script Backend (REST API Mode)
// Frontend: GitHub Pages | Backend: GAS Web App
// ============================================================

const SPREADSHEET_ID    = '1XbVkIvZhJP0ANcO0ehUq7ebDF_cOqyl3IIoP_Mvp_qo';
const SHEET_NAME_STICKER = 'บันทึกการพิมพ์';
const SHEET_NAME_CERT    = 'บันทึกใบรับรอง';
const MASTER_SHEET_NAME  = 'Master Product';
const PLAN_SHEET_NAME_WH  = 'Plan';
const QC_STD_SHEET_NAME   = 'StandardTST';
const MECH_LOG_SHEET_NAME = 'บันทึกคุณสมบัติทางกล';

// ── Production Block & QC Hold (external spreadsheets) ─────────────────────
const PROD_BLOCK_SS_ID   = '1TXsmafvd-QPhFakvm7yOuyPgAyztaDzzRd1SHUIRWrY';
const QC_HOLD_SS_ID      = '1YMwI8sbtInCBWVEYr877GrgkoYcmLe83T0z884Xx7sQ';
const QC_HOLD_SHEET_NAME = 'งานกักคุณภาพQC/Hold-';

// ============================================================
// doGet — รับ GET request จาก frontend
// ============================================================
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';

  if (action === 'getMasterProductData') {
    const data = getMasterProductData();
    return jsonResponse(data);
  }

  if (action === 'getPlanByDate') {
    const date = (e && e.parameter && e.parameter.date) ? e.parameter.date : '';
    return jsonResponse(getPlanByDateForQC(date));
  }

  if (action === 'getCoilLots') {
    return jsonResponse(getCoilLots());
  }

  if (action === 'getQCHoldProductionPlan') {
    const offset = parseInt((e && e.parameter && e.parameter.monthOffset) ? e.parameter.monthOffset : '0') || 0;
    return jsonResponse(getQCHoldProductionPlan(offset));
  }

  if (action === 'getQCHoldHistory') {
    return jsonResponse(getQCHoldHistory());
  }

  // health check
  return jsonResponse({ status: 'QC-TST API ready', version: '2.0' });
}

// ============================================================
// doPost — รับ POST request จาก frontend (form-encoded)
// ============================================================
function doPost(e) {
  const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';
  const params = e.parameter || {};

  if (action === 'recordData') {
    return jsonResponse(recordData(params));
  }

  if (action === 'recordCertData') {
    return jsonResponse(recordCertData(params));
  }

  if (action === 'recordMechData') {
    return jsonResponse(recordMechData(params));
  }

  if (action === 'saveQCHoldSnapshot') {
    return jsonResponse(saveQCHoldSnapshot(params));
  }

  return jsonResponse({ success: false, message: 'Unknown action: ' + action });
}

// ============================================================
// Helper — สร้าง JSON response พร้อม CORS headers
// ============================================================
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// recordData — บันทึกการพิมพ์สติกเกอร์
// ============================================================
function recordData(formData) {
  try {
    const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet   = ss.getSheetByName(SHEET_NAME_STICKER);
    if (!sheet) { sheet = ss.insertSheet(SHEET_NAME_STICKER); }

    const headers = [
      'วันที่/เวลาพิมพ์', 'เลข มอก.', 'บริษัท', 'รายละเอียดสินค้า',
      'ผิวเคลือบ', 'เลขล็อต', 'ขนาด', 'แบบ', 'ประเภท',
      'ชนิดเคลือบ', 'ชั้นคุณภาพ', 'เลขที่ใบอนุญาต'
    ];

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length)
           .setFontWeight('bold').setBackground('#4285f4').setFontColor('#ffffff');
    }

    sheet.appendRow([
      new Date(),
      formData.tisi_no       || '',
      formData.company        || '',
      formData.product_desc   || '',
      formData.surface_coating || '',
      formData.lot_no         || '',
      formData.size           || '',
      formData.style          || '',
      formData.type           || '',
      formData.coating        || '',
      formData.grade          || '',
      formData.license_no     || ''
    ]);

    sheet.autoResizeColumns(1, headers.length);
    return { success: true, message: 'บันทึกข้อมูลลง Google Sheet สำเร็จ' };
  } catch (e) {
    return { success: false, message: 'เกิดข้อผิดพลาด: ' + e.toString() };
  }
}

// ============================================================
// recordCertData — บันทึกใบรับรองคุณภาพ
// ============================================================
function recordCertData(formData) {
  try {
    const ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME_CERT) || ss.insertSheet(SHEET_NAME_CERT);

    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'วันที่บันทึก', 'ชื่อลูกค้า', 'รหัสสินค้า', 'ชื่อสินค้า', 'ขนาด',
        'Lot / Heat No.', 'S/O No.', 'วันที่ส่ง', 'จำนวนส่ง',
        'C', 'Si', 'Mn', 'P', 'S', 'Yield', 'Tensile', 'Elongation'
      ]);
    }

    sheet.appendRow([
      new Date(),
      formData.customer_name  || '',
      formData.product_code   || '',
      formData.product_name   || '',
      formData.size           || '',
      formData.lot_no         || '',
      formData.so_no          || '',
      formData.delivery_date  || '',
      formData.delivery_qty   || '',
      formData.chem_c         || '',
      formData.chem_si        || '',
      formData.chem_mn        || '',
      formData.chem_p         || '',
      formData.chem_s         || '',
      formData.mech_yield     || '',
      formData.mech_tensile   || '',
      formData.mech_elon      || ''
    ]);

    return { success: true, message: 'บันทึกใบรับรองสำเร็จ' };
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

// ============================================================
// getMasterProductData — ดึงข้อมูล Master Product
// ============================================================
function getMasterProductData() {
  try {
    const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(MASTER_SHEET_NAME);
    if (!sheet) { throw new Error('ไม่พบชีทชื่อ "' + MASTER_SHEET_NAME + '"'); }

    const values        = sheet.getDataRange().getValues();
    const productMaster = {};

    for (let i = 1; i < values.length; i++) {
      const row         = values[i];
      const productCode = row[0] ? row[0].toString().trim().toUpperCase() : null;
      if (productCode) {
        productMaster[productCode] = {
          product_name: row[1] ? row[1].toString().trim() : '',
          size:         row[2] ? row[2].toString().trim() : '',
          style:        row[3] ? row[3].toString().trim() : ''
        };
      }
    }
    return productMaster;
  } catch (e) {
    return { error: e.message };
  }
}

// ============================================================
// getCoilLots — ดึงรายการ Lot Coil จากชีตบันทึกคุณสมบัติทางกล
// ============================================================
function getCoilLots() {
  try {
    const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(MECH_LOG_SHEET_NAME);
    if (!sheet || sheet.getLastRow() <= 1) return { success: true, lots: [] };

    const values = sheet.getDataRange().getValues();
    const lotMap = {}; // lot -> data (เก็บแถวล่าสุด)

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const lot = row[3] ? row[3].toString().trim() : null; // col D = ล็อต
      if (!lot) continue;
      lotMap[lot] = {
        lot:        lot,
        thickness:  row[2] != null ? row[2].toString() : '', // col C
        yield:      row[4] != null ? row[4].toString() : '', // col E
        tensile:    row[5] != null ? row[5].toString() : '', // col F
        elongation: row[6] != null ? row[6].toString() : '', // col G
        prod_date:  row[1] ? row[1].toString() : ''          // col B
      };
    }

    const lots = Object.values(lotMap)
      .sort((a, b) => a.lot.localeCompare(b.lot));

    return { success: true, lots: lots };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

// ============================================================
// getPlanByDateForQC — ดึงแผนการผลิตและจัดกลุ่มตามความหนา
// ============================================================
function getPlanByDateForQC(dateStr) {
  try {
    if (!dateStr) throw new Error('กรุณาระบุวันที่');

    // อ่านชีต Plan จาก FlowWH Spreadsheet
    const ss        = SpreadsheetApp.openById(SPREADSHEET_ID);
    const planSheet = ss.getSheetByName(PLAN_SHEET_NAME_WH);
    if (!planSheet) throw new Error('ไม่พบชีต "' + PLAN_SHEET_NAME_WH + '"');

    const planValues = planSheet.getDataRange().getValues();

    // อ่าน StandardTST → ชื่อ (col C=2) และความหนา (col K=10)
    const qcSheet = ss.getSheetByName(QC_STD_SHEET_NAME);
    const stdMap = {}; // code -> { thick, name }
    if (qcSheet) {
      const qcVals = qcSheet.getDataRange().getValues();
      for (let i = 1; i < qcVals.length; i++) {
        const row   = qcVals[i];
        const code  = row[1] ? row[1].toString().trim().toUpperCase() : null; // col B
        const name  = row[2] ? row[2].toString().trim() : '';                 // col C
        const thick = (row[10] != null && row[10] !== '') ? row[10].toString().trim() : null; // col K
        if (code) stdMap[code] = { thick: thick || 'ไม่ระบุ', name: name || code };
      }
    }

    // กรองรายการตามวันที่
    const productCodes = new Set();
    for (let i = 1; i < planValues.length; i++) {
      const row     = planValues[i];
      const dateVal = row[0];
      if (dateVal == null || dateVal === '') continue;

      let rowDateStr = '';
      if (dateVal instanceof Date) {
        rowDateStr = Utilities.formatDate(dateVal, 'Asia/Bangkok', 'yyyy-MM-dd');
      } else {
        const s = dateVal.toString().trim();
        if (s.length === 8 && /^\d{8}$/.test(s)) {
          rowDateStr = s.substring(0,4) + '-' + s.substring(4,6) + '-' + s.substring(6,8);
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
          rowDateStr = s;
        } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
          const p = s.split('/');
          rowDateStr = p[2] + '-' + p[1].padStart(2,'0') + '-' + p[0].padStart(2,'0');
        }
      }

      if (rowDateStr !== dateStr) continue;

      const code = row[4] ? row[4].toString().trim().toUpperCase() : null;
      if (code) productCodes.add(code);
    }

    if (productCodes.size === 0) {
      return { success: true, data: [], message: 'ไม่พบแผนการผลิตในวันที่นี้' };
    }

    // จัดกลุ่มตามความหนา เก็บทั้งรหัสและชื่อสินค้า
    const groups = {}; // thick -> [{code, name}, ...]
    for (const code of productCodes) {
      const info  = stdMap[code] || { thick: 'ไม่ระบุ', name: code };
      const thick = info.thick;
      if (!groups[thick]) groups[thick] = [];
      groups[thick].push({ code: code, name: info.name });
    }

    const result = Object.keys(groups)
      .sort((a, b) => {
        const fa = parseFloat(a), fb = parseFloat(b);
        return (isNaN(fa) ? 999 : fa) - (isNaN(fb) ? 999 : fb);
      })
      .map(thick => ({ thickness: thick, products: groups[thick].sort((a,b) => a.name.localeCompare(b.name)) }));

    return {
      success: true, data: result,
      message: 'พบ ' + productCodes.size + ' รายการ',
      _dbg: 'sheet=' + (!!qcSheet) + ' map=' + Object.keys(stdMap).length + ' mapSample=' + Object.keys(stdMap).slice(0,2).join('|') + ' planSample=' + Array.from(productCodes).slice(0,2).join('|')
    };

  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

// ============================================================
// recordMechData — บันทึกผลตรวจคุณสมบัติทางกลวัตถุดิบ
// ============================================================
function recordMechData(formData) {
  try {
    const ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(MECH_LOG_SHEET_NAME);
    if (!sheet) { sheet = ss.insertSheet(MECH_LOG_SHEET_NAME); }

    if (sheet.getLastRow() === 0) {
      const headers = ['วันที่บันทึก','วันที่ผลิต','ความหนา','ล็อต','Yield (MPa)','Tensile (MPa)','Elongation (%)','รหัสสินค้า','ชื่อสินค้า'];
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length)
           .setFontWeight('bold').setBackground('#7B2D8B').setFontColor('#ffffff');
    }

    const rows     = JSON.parse(formData.rows || '[]');
    const prodDate = formData.prod_date || '';
    const now      = new Date();

    for (const row of rows) {
      const products = JSON.parse(row.products || '[]');
      for (const prod of products) {
        sheet.appendRow([
          now,            prodDate,
          row.thickness  || '',
          row.lot        || '',
          row.yield      || '',
          row.tensile    || '',
          row.elongation || '',
          prod.code      || '',
          prod.name      || ''
        ]);
      }
    }

    sheet.autoResizeColumns(1, 8);
    return { success: true, message: 'บันทึกสำเร็จ ' + rows.length + ' รายการ' };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

// ============================================================
// getQCHoldProductionPlan — ดึงข้อมูล QC Hold และจับคู่กับแผนผลิต
// monthOffset: 0=เดือนปัจจุบัน, 1=เดือนหน้า, -1=เดือนที่แล้ว
// ============================================================
function getQCHoldProductionPlan(monthOffset) {
  try {
    monthOffset = monthOffset || 0;

    // ── Step 1: ดึงรายการสินค้า QC Hold ──────────────────────────────────────
    const qcSS    = SpreadsheetApp.openById(QC_HOLD_SS_ID);
    const qcSheet = qcSS.getSheetByName(QC_HOLD_SHEET_NAME);
    if (!qcSheet) return { success: false, message: 'ไม่พบชีต "' + QC_HOLD_SHEET_NAME + '"' };

    const qcData    = qcSheet.getDataRange().getValues();
    const qcItemMap = {};

    // หา header row ที่มี "Item number" อยู่ใน col B (index 1)
    let dataStartRow = 1;
    for (let i = 0; i < Math.min(5, qcData.length); i++) {
      if (String(qcData[i][1]).toLowerCase().includes('item')) {
        dataStartRow = i + 1;
        break;
      }
    }

    for (let i = dataStartRow; i < qcData.length; i++) {
      const itemCode    = String(qcData[i][1]).trim();
      const productName = String(qcData[i][2]).trim();
      const qty         = qcData[i][3];
      if (!itemCode || itemCode === 'undefined') continue;
      qcItemMap[itemCode] = {
        productName: productName,
        qty: (qty !== null && qty !== '') ? Number(qty) || 0 : 0
      };
    }

    if (Object.keys(qcItemMap).length === 0) {
      return { success: false, message: 'ไม่พบข้อมูลในชีต QC Hold' };
    }

    // ── Step 2: คำนวณชื่อชีตเดือนเป้าหมาย ────────────────────────────────────
    const THAI_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                         'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
    const now        = new Date();
    const target     = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const beYear2    = String((target.getFullYear() + 543) % 100);
    const sheetName  = THAI_MONTHS[target.getMonth()] + ' ' + beYear2;

    // ── Step 3: เปิดชีตแผนผลิต ────────────────────────────────────────────────
    const planSS   = SpreadsheetApp.openById(PROD_BLOCK_SS_ID);
    const allSheets = planSS.getSheets();

    // normalize: ตัด whitespace ทุกชนิด + NFC เพื่อรับมือ Unicode ต่างกัน
    const norm = function(s) {
      return s.replace(/[   -​﻿]/g, ' ').trim();
    };
    const normTarget = norm(sheetName);

    // Tier 1: exact match
    let planSheet = planSS.getSheetByName(sheetName);

    // Tier 2: normalized whitespace match
    if (!planSheet) {
      planSheet = allSheets.find(function(s) {
        return norm(s.getName()) === normTarget;
      }) || null;
    }

    // Tier 3: contains match — ชื่อเดือนไทยปรากฏในชีต และปีตรงกัน
    if (!planSheet) {
      planSheet = allSheets.find(function(s) {
        const n = s.getName();
        return n.indexOf(THAI_MONTHS[target.getMonth()]) !== -1 && n.indexOf(beYear2) !== -1;
      }) || null;
    }

    if (!planSheet) {
      const available = allSheets.map(function(s) { return s.getName(); });
      return { success: false, message: 'ไม่พบชีต "' + sheetName + '" ในตาราง Production Block', availableSheets: available };
    }

    const planData = planSheet.getDataRange().getValues();
    if (planData.length < 2) {
      return { success: true, data: [], sheetName: sheetName, message: 'ชีตว่างเปล่า',
               totalQCItems: Object.keys(qcItemMap).length, itemsWithPlan: 0, itemsNoPlan: Object.keys(qcItemMap).length };
    }

    // ── Step 4: อ่าน date columns จาก row 0 (เริ่มจาก col G = index 6) ────────
    // รับเฉพาะ cell ที่เป็น Date object หรือ string รูปแบบวันที่ d/M/yyyy หรือ d-M-yyyy เท่านั้น
    const headerRow = planData[0];
    const dateCols  = [];
    const DATE_PATTERN = /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/;
    for (let col = 6; col < headerRow.length; col++) {
      const cell = headerRow[col];
      if (cell === null || cell === '') continue;
      if (cell instanceof Date) {
        const label = Utilities.formatDate(cell, 'Asia/Bangkok', 'd/M/yyyy');
        dateCols.push({ colIdx: col, dateLabel: label });
      } else if (DATE_PATTERN.test(String(cell).trim())) {
        dateCols.push({ colIdx: col, dateLabel: String(cell).trim() });
      }
      // ข้าม cell ที่เป็นข้อความ เช่น "ตัน", "รวม", "%" ฯลฯ
    }

    // ── Step 5: จับคู่ QC Hold กับแผนผลิต ───────────────────────────────────
    const matchedMap = {};

    for (let row = 1; row < planData.length; row++) {
      const productCode = String(planData[row][1]).trim(); // col B = index 1
      if (!productCode || !qcItemMap[productCode]) continue;

      const plannedDates = [];
      for (const { colIdx, dateLabel } of dateCols) {
        const cell = planData[row][colIdx];
        if (cell === null || cell === '' || cell === 0) continue;
        const qty = Number(cell);
        if (!isNaN(qty) && qty > 0) plannedDates.push({ date: dateLabel, qty: qty });
      }

      if (!matchedMap[productCode]) {
        matchedMap[productCode] = {
          itemCode:     productCode,
          productName:  qcItemMap[productCode].productName,
          qcQty:        qcItemMap[productCode].qty,
          plannedDates: plannedDates
        };
      } else {
        // รวม qty ถ้าสินค้าเดียวกันผลิตหลาย Line เครื่อง
        for (const pd of plannedDates) {
          const existing = matchedMap[productCode].plannedDates.find(d => d.date === pd.date);
          if (existing) {
            existing.qty += pd.qty;
          } else {
            matchedMap[productCode].plannedDates.push(pd);
          }
        }
      }
    }

    // รายการ QC Hold ที่ไม่มีแผนผลิตในเดือนนี้
    for (const [itemCode, info] of Object.entries(qcItemMap)) {
      if (!matchedMap[itemCode]) {
        matchedMap[itemCode] = {
          itemCode:     itemCode,
          productName:  info.productName,
          qcQty:        info.qty,
          plannedDates: []
        };
      }
    }

    const results = Object.values(matchedMap).sort((a, b) => {
      const aHas = a.plannedDates.length > 0 ? 1 : 0;
      const bHas = b.plannedDates.length > 0 ? 1 : 0;
      if (bHas !== aHas) return bHas - aHas;
      return a.itemCode.localeCompare(b.itemCode);
    });

    return {
      success:      true,
      data:         results,
      sheetName:    sheetName,
      totalQCItems: Object.keys(qcItemMap).length,
      itemsWithPlan: results.filter(r => r.plannedDates.length > 0).length,
      itemsNoPlan:   results.filter(r => r.plannedDates.length === 0).length
    };

  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

// ============================================================
// saveQCHoldSnapshot — บันทึก snapshot ยอด Hold ณ วันนี้
// ============================================================
const QC_HOLD_HISTORY_SHEET = 'QC_Hold_History';

function saveQCHoldSnapshot(params) {
  try {
    const totalItems = parseInt(params.totalItems || '0') || 0;
    const totalQty   = parseFloat(params.totalQty   || '0') || 0;
    const note       = params.note || '';

    const ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(QC_HOLD_HISTORY_SHEET);

    if (!sheet) {
      sheet = ss.insertSheet(QC_HOLD_HISTORY_SHEET);
      sheet.appendRow(['วันที่บันทึก', 'จำนวนรายการ Hold', 'จำนวน Bundle รวม', 'หมายเหตุ']);
      sheet.getRange(1, 1, 1, 4)
           .setFontWeight('bold').setBackground('#C0392B').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }

    const now       = new Date();
    const dateLabel = Utilities.formatDate(now, 'Asia/Bangkok', 'dd/MM/yyyy HH:mm');
    const todayStr  = Utilities.formatDate(now, 'Asia/Bangkok', 'dd/MM/yyyy');
    const lastRow   = sheet.getLastRow();

    if (lastRow > 1) {
      const lastDateVal = sheet.getRange(lastRow, 1).getValue();
      const lastDateStr = lastDateVal instanceof Date
        ? Utilities.formatDate(lastDateVal, 'Asia/Bangkok', 'dd/MM/yyyy')
        : String(lastDateVal).substring(0, 10);
      if (lastDateStr === todayStr) {
        sheet.getRange(lastRow, 1, 1, 4).setValues([[dateLabel, totalItems, totalQty, note]]);
        return { success: true, message: 'อัปเดตยอด Hold วันนี้แล้ว (' + dateLabel + ')', updated: true };
      }
    }

    sheet.appendRow([dateLabel, totalItems, totalQty, note]);
    return { success: true, message: 'บันทึกยอด Hold สำเร็จ (' + dateLabel + ')', updated: false };

  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

// ============================================================
// autoSaveQCHoldSnapshot — trigger อัตโนมัติทุกวัน 10:00-11:00 น.
// ============================================================
function autoSaveQCHoldSnapshot() {
  try {
    const qcSS    = SpreadsheetApp.openById(QC_HOLD_SS_ID);
    const qcSheet = qcSS.getSheetByName(QC_HOLD_SHEET_NAME);
    if (!qcSheet) { Logger.log('autoSave: ไม่พบชีต ' + QC_HOLD_SHEET_NAME); return; }

    const qcData = qcSheet.getDataRange().getValues();
    let dataStartRow = 1;
    for (let i = 0; i < Math.min(5, qcData.length); i++) {
      if (String(qcData[i][1]).toLowerCase().includes('item')) { dataStartRow = i + 1; break; }
    }

    let totalItems = 0;
    let totalQty   = 0;
    for (let i = dataStartRow; i < qcData.length; i++) {
      const itemCode = String(qcData[i][1]).trim();
      if (!itemCode || itemCode === 'undefined') continue;
      totalItems++;
      totalQty += (qcData[i][3] !== null && qcData[i][3] !== '') ? Number(qcData[i][3]) || 0 : 0;
    }

    saveQCHoldSnapshot({ totalItems: String(totalItems), totalQty: String(totalQty), note: 'อัตโนมัติ' });
    Logger.log('autoSaveQCHoldSnapshot: ' + totalItems + ' รายการ, ' + totalQty + ' Bundle');

  } catch (err) {
    Logger.log('autoSaveQCHoldSnapshot error: ' + err.toString());
  }
}


// ============================================================
// getQCHoldHistory — ดึงประวัติยอด Hold ย้อนหลัง
// ============================================================
function getQCHoldHistory() {
  try {
    const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(QC_HOLD_HISTORY_SHEET);
    if (!sheet || sheet.getLastRow() <= 1) {
      return { success: true, data: [], message: 'ยังไม่มีประวัติ' };
    }

    const values  = sheet.getDataRange().getValues();
    const history = [];
    for (let i = 1; i < values.length; i++) {
      const row     = values[i];
      const dateVal = row[0];
      if (!dateVal) continue;
      const dateLabel = dateVal instanceof Date
        ? Utilities.formatDate(dateVal, 'Asia/Bangkok', 'dd/MM/yyyy')
        : String(dateVal).substring(0, 10);
      history.push({ date: dateLabel, items: Number(row[1]) || 0, qty: Number(row[2]) || 0, note: row[3] ? String(row[3]) : '' });
    }

    return { success: true, data: history };

  } catch (err) {
    return { success: false, message: err.toString() };
  }
}
