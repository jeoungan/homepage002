function doPost(e) {
  // CORS 처리 설정 (필수)
  var headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  try {
    // 스프레드시트 가져오기 (현재 스크립트가 로드된 스프레드시트)
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = doc.getSheetByName('결과') || doc.getSheets()[0]; // '결과' 시트가 없으면 첫 번째 시트 사용
    
    // 받아온 POST 데이터 파싱 (JSON 배열 형태라고 가정)
    var parsedData = JSON.parse(e.postData.contents);
    
    // 헤더가 없다면 1행에 헤더 추가
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'participant_id', 
        'timestamp', 
        'condition', 
        'level', 
        'trial', 
        'stimulus', 
        'stimulus_2', 
        'correct_response', 
        'participant_response', 
        'correct', 
        'rt_ms'
      ]);
    }

    // 결과 데이터(배열)를 한 줄씩 스프레드시트에 추가
    if (Array.isArray(parsedData)) {
      var rowsToAppend = parsedData.map(function(row) {
        return [
          row.participant_id,
          row.timestamp,
          row.condition,
          row.level,
          row.trial,
          row.stimulus,
          row.stimulus_2,
          row.correct_response,
          row.participant_response,
          row.correct,
          row.rt_ms
        ];
      });
      
      // 일괄 추가 (성능 향상)
      if (rowsToAppend.length > 0) {
        var startRow = sheet.getLastRow() + 1;
        var startCol = 1;
        var numRows = rowsToAppend.length;
        var numCols = rowsToAppend[0].length;
        sheet.getRange(startRow, startCol, numRows, numCols).setValues(rowsToAppend);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({"result":"success"}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({"result":"error", "error": error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// OPTIONS 요청 처리 (보안 정책 회피용)
function doOptions(e) {
  var headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}
