/**
 * 婚禮出席回覆：Google Apps Script 後端
 *
 * 使用方式（詳見 README）：
 * 1. 在試算表選「擴充功能 > Apps Script」，把這個檔案的內容整個貼上
 * 2. 上方函式選單選 setup 後按「執行」，建立「回覆」與「統計」工作表
 * 3. 「部署 > 新增部署作業 > 網頁應用程式」，執行身分選「我」，存取權選「所有人」
 */

const SHEET_NAME = '回覆';
const STATS_SHEET_NAME = '統計';
const HEADERS = ['填寫時間', '姓名', '手機', '男方/女方', '是否出席', '出席人數', '素食人數', '兒童椅', '飲食禁忌或過敏'];
// 對應 HEADERS 每一欄的格式；手機用文字格式才能保留開頭的 0
const NUMBER_FORMATS = ['yyyy/mm/dd hh:mm:ss', '@', '@', '@', '@', '0', '0', '0', '@'];
const PHONE_COL = 3;
const MAX_GUESTS = 10;
const SIDES = ['男方', '女方'];
const PHONE_RE = /^09\d{8}$/;
const MAX_DIETARY_LENGTH = 100;

// 「統計」工作表的內容：[項目, 公式]
const STATS = [
  ['總回覆數', "=COUNTA('回覆'!B2:B)"],
  ['出席組數', "=COUNTIF('回覆'!E2:E,\"會出席\")"],
  ['無法出席組數', "=COUNTIF('回覆'!E2:E,\"無法出席\")"],
  ['出席總人數', "=SUM('回覆'!F2:F)"],
  ['男方出席人數', "=SUMIF('回覆'!D2:D,\"男方\",'回覆'!F2:F)"],
  ['女方出席人數', "=SUMIF('回覆'!D2:D,\"女方\",'回覆'!F2:F)"],
  ['素食總數', "=SUM('回覆'!G2:G)"],
  ['兒童椅總數', "=SUM('回覆'!H2:H)"],
  ['有飲食禁忌或過敏組數', "=COUNTIF('回覆'!I2:I,\"?*\")"],
  ['預估桌數（每桌 10 人）', '=ROUNDUP(B5/10)'],
];

// 有飲食禁忌或過敏的出席來賓清單，放在「統計」工作表 D1，方便提供給餐廳
const DIETARY_LIST_FORMULA =
  "=IFERROR(QUERY('回覆'!B2:I,\"select B, D, F, I where E = '會出席' and I <> '' " +
  "label B '姓名', D '男方/女方', F '出席人數', I '飲食禁忌或過敏'\",0),\"尚無飲食禁忌資料\")";

function doGet() {
  return json({ ok: true });
}

function doPost(e) {
  try {
    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (err) {
      return json({ ok: false, error: '資料格式錯誤' });
    }

    // honeypot 有值代表是機器人，假裝成功但不寫入
    if (data.website) return json({ ok: true, updated: false });

    const error = validate(data);
    if (error) return json({ ok: false, error: error });

    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000);
    } catch (err) {
      return json({ ok: false, error: '目前填寫人數較多，請稍後再試' });
    }

    try {
      const sheet = getReplySheet(SpreadsheetApp.getActiveSpreadsheet());
      const phone = String(data.phone);
      const existingRow = findRowByPhone(sheet, phone);
      const rowIndex = existingRow || sheet.getLastRow() + 1;
      const attending = data.attending === true;

      const row = [
        new Date(),
        sanitize(data.name),
        phone,
        data.side,
        attending ? '會出席' : '無法出席',
        attending ? data.guests : 0,
        attending ? data.vegetarian : 0,
        attending ? data.childSeats : 0,
        attending ? sanitize(data.dietary || '') : '',
      ];

      const range = sheet.getRange(rowIndex, 1, 1, HEADERS.length);
      range.setNumberFormats([NUMBER_FORMATS]);
      range.setValues([row]);

      return json({ ok: true, updated: Boolean(existingRow) });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: '伺服器發生錯誤，請稍後再試' });
  }
}

/** 手動執行一次：建立「回覆」與「統計」工作表 */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  getReplySheet(ss);

  const stats = ss.getSheetByName(STATS_SHEET_NAME) || ss.insertSheet(STATS_SHEET_NAME);
  stats.clear();
  stats.getRange(1, 1, STATS.length + 1, 2).setValues([['項目', '數值']].concat(STATS));
  stats.getRange(1, 4).setFormula(DIETARY_LIST_FORMULA);
  stats.getRange('1:1').setFontWeight('bold');
  stats.setFrozenRows(1);
  stats.autoResizeColumns(1, 7);
}

function getReplySheet(ss) {
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME, 0);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.getRange(1, PHONE_COL, sheet.getMaxRows(), 1).setNumberFormat('@');
  }
  return sheet;
}

function findRowByPhone(sheet, phone) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const cell = sheet
    .getRange(2, PHONE_COL, lastRow - 1, 1)
    .createTextFinder(phone)
    .matchEntireCell(true)
    .findNext();
  return cell ? cell.getRow() : 0;
}

function validate(data) {
  if (!data || typeof data !== 'object') return '資料格式錯誤';
  if (!isNonEmptyString(data.name, 50)) return '請填寫姓名';
  if (!PHONE_RE.test(String(data.phone || ''))) return '手機號碼格式錯誤';
  if (SIDES.indexOf(data.side) === -1) return '請選擇男方或女方親友';
  if (typeof data.attending !== 'boolean') return '請選擇是否出席';

  if (data.attending) {
    if (!isIntInRange(data.guests, 1, MAX_GUESTS)) return '出席人數錯誤';
    if (!isIntInRange(data.vegetarian, 0, data.guests)) return '素食人數不可超過出席人數';
    if (!isIntInRange(data.childSeats, 0, data.guests)) return '兒童椅數量不可超過出席人數';
    // 舊版網頁不會送 dietary，視為沒有飲食禁忌
    const dietary = data.dietary === undefined ? '' : data.dietary;
    if (typeof dietary !== 'string' || dietary.length > MAX_DIETARY_LENGTH) {
      return '飲食禁忌或過敏請在 ' + MAX_DIETARY_LENGTH + ' 字以內';
    }
  }
  return '';
}

function isNonEmptyString(value, maxLength) {
  return typeof value === 'string' && value.trim() !== '' && value.length <= maxLength;
}

function isIntInRange(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

// 避免公式注入：開頭是 = + - @ 的字串會被試算表當成公式
function sanitize(value) {
  const text = String(value).trim();
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
