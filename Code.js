// ============================================================
// QC-TST — Google Apps Script Backend (REST API Mode)
// Frontend: GitHub Pages | Backend: GAS Web App
// ============================================================

const SPREADSHEET_ID    = '1XbVkIvZhJP0ANcO0ehUq7ebDF_cOqyl3IIoP_Mvp_qo';
const SHEET_NAME_STICKER = 'บันทึกการพิมพ์';
const SHEET_NAME_CERT    = 'บันทึกใบรับรอง';
const MASTER_SHEET_NAME  = 'Master Product';

// ============================================================
// doGet — รับ GET request จาก frontend
// ============================================================
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';

  if (action === 'getMasterProductData') {
    const data = getMasterProductData();
    return jsonResponse(data);
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
