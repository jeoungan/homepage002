const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1PRViVwiNLfz66IYb9ENdK-RabrU9aBzvexFio3c1UIE/edit?usp=sharing';

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
    throw new Error('시트에 데이터를 저장하는 중 오류가 발생했습니다: ' + error.message);
  }
}
