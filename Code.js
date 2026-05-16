// ============================================================
// QC-TST — Google Apps Script Backend (REST API Mode)
// Frontend: GitHub Pages | Backend: GAS Web App
// ============================================================

const SPREADSHEET_ID    = '1XbVkIvZhJP0ANcO0ehUq7ebDF_cOqyl3IIoP_Mvp_qo';
const SHEET_NAME_STICKER = 'บันทึกการพิมพ์';
const SHEET_NAME_CERT    = 'บันทึกใบรับรอง';
const MASTER_SHEET_NAME  = 'Master Product';
const PLAN_SPREADSHEET_ID = '1uLXHWv6_jTb1wnaIzq652gn2gH0Odiw2KOlB8DyY2Us';
const PLAN_SHEET_NAME_WH  = 'Sheet Plan';
const QC_STD_SHEET_NAME   = 'TST-QC Standard Master';
const MECH_LOG_SHEET_NAME = 'บันทึกคุณสมบัติทางกล';

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
        'C', 'Si', 'Mn', 'P', 'S', 'Yield', 'Tensile', 'Elongation'
      ]);
    }

    sheet.appendRow([
      new Date(),
      formData.customer_name  || '',
      formData.product_code   || '',
      formData.product_name   || '',
      formData.size           || '',
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
// getPlanByDateForQC — ดึงแผนการผลิตและจัดกลุ่มตามความหนา
// ============================================================
function getPlanByDateForQC(dateStr) {
  try {
    if (!dateStr) throw new Error('กรุณาระบุวันที่');

    // อ่านชีต Plan จาก FlowWH Spreadsheet
    const ssPlan    = SpreadsheetApp.openById(PLAN_SPREADSHEET_ID);
    const planSheet = ssPlan.getSheetByName(PLAN_SHEET_NAME_WH);
    if (!planSheet) throw new Error('ไม่พบชีต "' + PLAN_SHEET_NAME_WH + '"');

    const planValues = planSheet.getDataRange().getValues();

    // อ่าน TST-QC Standard Master → ชื่อ (col C=2) และความหนา (col K=10)
    // ชีตนี้อยู่ใน QC spreadsheet (SPREADSHEET_ID)
    const ssQC   = SpreadsheetApp.openById(SPREADSHEET_ID);
    const qcSheet = ssQC.getSheetByName(QC_STD_SHEET_NAME);
    const stdMap = {}; // code -> { thick, name }
    if (qcSheet) {
      const qcVals = qcSheet.getDataRange().getValues();
      for (let i = 1; i < qcVals.length; i++) {
        const row   = qcVals[i];
        const code  = row[0] ? row[0].toString().trim().toUpperCase() : null;
        const name  = row[2] ? row[2].toString().trim() : '';   // col C
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

    // จัดกลุ่มตามความหนา แสดงชื่อสินค้า (col C) ไม่แสดงรหัส
    const groups = {}; // thick -> [name, ...]
    for (const code of productCodes) {
      const info  = stdMap[code] || { thick: 'ไม่ระบุ', name: code };
      const thick = info.thick;
      if (!groups[thick]) groups[thick] = [];
      groups[thick].push(info.name);
    }

    const result = Object.keys(groups)
      .sort((a, b) => {
        const fa = parseFloat(a), fb = parseFloat(b);
        return (isNaN(fa) ? 999 : fa) - (isNaN(fb) ? 999 : fb);
      })
      .map(thick => ({ thickness: thick, products: groups[thick].sort() }));

    return { success: true, data: result, message: 'พบ ' + productCodes.size + ' รายการ' };

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
      const headers = ['วันที่บันทึก','วันที่ผลิต','ความหนา','ล็อต','Yield (MPa)','Tensile (MPa)','Elongation (%)','สินค้ารายการ'];
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length)
           .setFontWeight('bold').setBackground('#7B2D8B').setFontColor('#ffffff');
    }

    const rows     = JSON.parse(formData.rows || '[]');
    const prodDate = formData.prod_date || '';
    const now      = new Date();

    for (const row of rows) {
      sheet.appendRow([
        now,            prodDate,
        row.thickness  || '',
        row.lot        || '',
        row.yield      || '',
        row.tensile    || '',
        row.elongation || '',
        row.products   || ''
      ]);
    }

    sheet.autoResizeColumns(1, 8);
    return { success: true, message: 'บันทึกสำเร็จ ' + rows.length + ' รายการ' };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}
