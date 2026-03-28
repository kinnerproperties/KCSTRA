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

  // Send email notification
  var subject = 'New KCSTRA Contact Form Submission';
  var body = 'New contact form submission:\n\n'
    + 'Name: ' + (data.name || 'N/A') + '\n'
    + 'Email: ' + (data.email || 'N/A') + '\n'
    + 'Phone: ' + (data.phone || 'N/A') + '\n'
    + 'Properties: ' + (data.properties || 'N/A') + '\n'
    + 'Message: ' + (data.message || 'N/A') + '\n\n'
    + 'Submitted: ' + new Date().toLocaleString();

  MailApp.sendEmail('KCSTRA.info@gmail.com', subject, body);

  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return ContentService
    .createTextOutput('KCSTRA form endpoint is live.')
    .setMimeType(ContentService.MimeType.TEXT);
}
