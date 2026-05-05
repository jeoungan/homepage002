function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('10초 챌린지')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
}

// 외부(Github 배포 등)에서 들어오는 POST 요청을 처리
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['참가자 ID', '기록(초)', '오차(초)', '참여 일시']);
    sheet.setFrozenRows(1);
    sheet.getRange("A1:D1").setFontWeight("bold");
    sheet.getRange("A1:D1").setBackground("#e0e0e0");
  }
  
  // URLSearchParams 로 보낸 데이터를 e.parameter 에서 추출
  const pId = e.parameter.pId;
  const finalTime = e.parameter.finalTime;
  const diff = e.parameter.diff;
  const timestamp = e.parameter.timestamp;
  
  sheet.appendRow([pId, finalTime, diff, timestamp]);
  
  return ContentService.createTextOutput(JSON.stringify({ "status": "success" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doOptions(e) {
  return ContentService.createTextOutput("OK")
    .setMimeType(ContentService.MimeType.TEXT);
}
