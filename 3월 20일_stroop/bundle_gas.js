const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');
const js = fs.readFileSync('script.js', 'utf8');

let bundle = html.replace('<link rel="stylesheet" href="style.css">', `<style>\n${css}\n</style>`);
bundle = bundle.replace('<script src="script.js"></script>', `<script>\n${js}\n</script>`);

fs.writeFileSync('index_gas.html', bundle);
fs.writeFileSync('Code.gs', `const SHEET_URL = "https://docs.google.com/spreadsheets/d/1h-4Ar5ICXArxErLgdZzmimjbI5Y6PY02_UYmwzMaImI/edit";

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Stroop 인지 실험')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function saveDataToSheet(rows) {
  try {
    const sheet = SpreadsheetApp.openByUrl(SHEET_URL).getActiveSheet();
    
    // If the sheet is empty, add headers first
    if (sheet.getLastRow() === 0) {
      const headers = [
        '참가자 ID', '시작 일시', '전체 정확도(%)', '평균 반응시간(ms)', 
        '일치 평균(ms)', '불일치 평균(ms)', 
        '단계(Phase)', 'Trial', '제시 단어', '글자 색상', 
        '조건(일치여부)', '참가자 응답', '정답여부(1/0)', '반응시간(ms)'
      ];
      sheet.appendRow(headers);
      sheet.setFrozenRows(1);
    }
    
    // Append all trial rows
    const lastRow = sheet.getLastRow() + 1;
    sheet.getRange(lastRow, 1, rows.length, rows[0].length).setValues(rows);
    
    return true;
  } catch (e) {
    throw new Error(e.toString());
  }
}
`);
console.log('Successfully bundled index_gas.html and generated Code.gs!');
