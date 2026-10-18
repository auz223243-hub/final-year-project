/**
 * Classroom Comfort Vote – Google Sheets backend.
 *
 * Works both as a script opened from a Google Sheet (Extensions > Apps Script) and as a
 * standalone project created at script.google.com. In the standalone case the script
 * creates its own spreadsheet the first time it runs and remembers it.
 *
 * Setup: paste this file, run setup() once (authorise; the log shows the sheet's link),
 * then Deploy > New deployment (or Manage deployments > Edit > New version) > Web app,
 * Execute as: Me, Who has access: Anyone. The web-app URL (ends with /exec) goes into
 * CONFIG.ENDPOINT in docs/index.html.
 */
const KEY = 'fyp-ccv-2026';           // must match CONFIG.KEY in docs/index.html
const SHEET_NAME = 'votes';
const COLUMNS = [
  'sid', 'client_time', 'participant', 'seat_zone', 'tsv', 'tpv', 'accept',
  'garments', 'clo', 'clo_tbc', 'activity', 'sun', 'draught', 'stuffy',
  'self_sens', 'duration_s', 'device_id', 'version'
];

// Run once from the editor: authorises the script and prints the spreadsheet link.
function setup() {
  const ss = getSpreadsheet();
  getSheet();
  Logger.log('Votes are stored in: ' + ss.getUrl());
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.key !== KEY) return reply({ ok: false, error: 'bad key' });
    // skip a vote that already arrived (same sid within the last 6 hours)
    const cache = CacheService.getScriptCache();
    if (d.sid && cache.get(d.sid)) return reply({ ok: true, duplicate: true });
    const sheet = getSheet();
    sheet.appendRow([new Date()].concat(COLUMNS.map(function (c) {
      return d[c] === undefined || d[c] === null ? '' : d[c];
    })));
    if (d.sid) cache.put(d.sid, '1', 21600);
    return reply({ ok: true });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Opening the URL in a browser shows how many votes are stored – a quick health check.
function doGet() {
  try {
    const n = Math.max(getSheet().getLastRow() - 1, 0);
    return reply({ ok: true, votes: n });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  }
}

function getSpreadsheet() {
  const bound = SpreadsheetApp.getActiveSpreadsheet();
  if (bound) return bound;
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  const ss = SpreadsheetApp.create('Classroom Comfort Votes');
  props.setProperty('SHEET_ID', ss.getId());
  return ss;
}

function getSheet() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['server_time'].concat(COLUMNS));
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
