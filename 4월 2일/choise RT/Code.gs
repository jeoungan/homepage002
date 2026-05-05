const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1UPAUlBBfHieCFUzH-4qLoc-0Ao5wAakoJJM42ynaZP0/edit?usp=sharing';

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index_gas')
    .setTitle('Choice RT Task')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

function saveData(results) {
  try {
    const sheet = SpreadsheetApp.openByUrl(SHEET_URL).getActiveSheet();
    
    // 데이터 파싱
    const data = JSON.parse(results);
    if (!data || data.length === 0) return true;
    
    // 첫 데이터일 경우 헤더 추가
    if (sheet.getLastRow() === 0) {
      const headers = Object.keys(data[0]);
      sheet.appendRow(headers);
    }
    
    // 데이터 추가
    data.forEach(row => {
      const values = Object.values(row);
      sheet.appendRow(values);
    });
    
    return true;
  } catch (error) {
    Logger.log(error);
    return false;
  }
}
