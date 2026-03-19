// ============================================
// PASTE THIS INTO GOOGLE APPS SCRIPT
// (Extensions > Apps Script in your Google Sheet)
// ============================================

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);

  sheet.appendRow([
    new Date().toLocaleString(),
    data.name || '',
    data.email || '',
    data.phone || '',
    data.properties || '',
    data.message || ''
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return ContentService
    .createTextOutput('KCSTRA form endpoint is live.')
    .setMimeType(ContentService.MimeType.TEXT);
}
