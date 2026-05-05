const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1z6x0kLJg6AIuH31_oba_upnKwRcj3du-w_CQ_j4FHSM/edit?usp=sharing';

function doGet(e) {
  // index_gas.html 파일을 렌더링하고 모바일 반응형 뷰포트를 설정합니다.
  return HtmlService.createHtmlOutputFromFile('index_gas')
      .setTitle('Neon Maze Game')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
}

/**
 * 프론트엔드에서 클리어 시 호출되어 스프레드시트에 데이터를 저장합니다.
 * @param {string} level - 클리어한 난이도 ('easy', 'medium', 'hard')
 * @param {number} timeSeconds - 소요된 시간(초)
 */
function saveData(level, timeSeconds) {
  if (SHEET_URL === 'https://docs.google.com/spreadsheets/d/1z6x0kLJg6AIuH31_oba_upnKwRcj3du-w_CQ_j4FHSM/edit?usp=sharing') {
      return false; // URL이 설정되지 않았다면 저장 생략
  }

  try {
    const sheet = SpreadsheetApp.openByUrl(SHEET_URL).getActiveSheet();
    const timestamp = new Date(); // 서버(현재) 시간
    
    // 기록할 데이터 순서: [시간, 게임 종류(식별용), 난이도, 소요 시간(초)]
    sheet.appendRow([timestamp, "Maze Game", level, timeSeconds]);
    
    return true;
  } catch (error) {
    console.error("Error saving data: ", error.toString());
    return false;
  }
}
