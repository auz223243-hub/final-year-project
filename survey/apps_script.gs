/** @OnlyCurrentDoc */
/**
 * Classroom Comfort Vote – Google Sheets backend.
 *
 * Paste this whole file into Extensions > Apps Script of an empty Google Sheet,
 * then Deploy > New deployment > Web app, Execute as: Me, Who has access: Anyone.
 * Copy the web-app URL (ends with /exec) into CONFIG.ENDPOINT in docs/index.html.
 *
 * Each vote becomes one row in the "votes" sheet, with the server time first.
 */
const KEY = 'fyp-ccv-2026';           // must match CONFIG.KEY in docs/index.html
const SHEET_NAME = 'votes';
const COLUMNS = [
  'sid', 'client_time', 'participant', 'seat_zone', 'tsv', 'tpv', 'accept',
  'garments', 'clo', 'clo_tbc', 'activity', 'sun', 'draught', 'stuffy',
  'self_sens', 'duration_s', 'device_id', 'version'
];

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
  const n = Math.max(getSheet().getLastRow() - 1, 0);
  return reply({ ok: true, votes: n });
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
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
