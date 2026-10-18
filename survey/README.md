# Classroom Comfort Vote – online survey

The participant page is `docs/index.html`, served by GitHub Pages at
<https://auz223243-hub.github.io/final-year-project/>. Each submitted vote is posted to a
Google Apps Script web app (`survey/apps_script.gs`) that appends one row to a Google Sheet.

## One-time setup (about 10 minutes)

### 1. Google Sheet + Apps Script (where the answers are stored)

1. Create a new, empty Google Sheet (e.g. "Classroom Comfort Votes").
2. In the sheet: **Extensions → Apps Script**. Delete the sample code, paste the whole of
   `survey/apps_script.gs`, and save.
3. **Deploy → New deployment →** gear icon **→ Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy**, allow the permissions Google asks for, and copy the **Web app URL**
   (it ends with `/exec`).
5. Open that URL in a browser: it should show `{"ok":true,"votes":0}`.

### 2. Put the URL into the page

In `docs/index.html`, set `ENDPOINT: "https://script.google.com/macros/s/…/exec"` in the
`CONFIG` block near the top of the script, and commit.

### 3. Turn on GitHub Pages

Repository **Settings → Pages → Build and deployment → Source: Deploy from a branch →**
branch `survey-site` (or `main` after merging), folder **/docs → Save**. After a minute the
page is live at the address above.

## Updating the live backend with clasp (keeps the same /exec URL)

`.clasp.json` points at the existing Apps Script project and `appsscript.json` holds the web-app
settings (execute as me, anyone can access), so no files need editing. `.claspignore` limits
the push to `apps_script.gs` and `appsscript.json`. Run on your own computer (needs Node.js);
the commands pin clasp 2.4.2 because clasp 3 renamed `deploy`.

1. Turn on **Google Apps Script API** at <https://script.google.com/home/usersettings>.
2. In this folder (`survey/` on the `survey-site` branch):

   ```bash
   npx @google/clasp@2.4.2 login        # browser opens: sign in as auz223243@gmail.com, Allow
   npx @google/clasp@2.4.2 push         # "overwrite manifest?" -> y. Replaces the old 代码.gs
   npx @google/clasp@2.4.2 open         # opens the editor
   ```

3. In the editor choose **setup** in the function list → **Run** → allow the permissions.
   The execution log prints `Votes are stored in: https://docs.google.com/spreadsheets/…`.
4. Point the existing web-app deployment at the new code:

   ```bash
   npx @google/clasp@2.4.2 deployments  # the web-app ID is AKfycbyjZ_6y…WHkG3mF
   npx @google/clasp@2.4.2 deploy -i AKfycbyjZ_6y88BAOvnpLxH1QasDTIQf2sZeYAoN4GDbrCcb2e3atyM9NVYW1wYa_WHkG3mF -d "fix standalone sheet"
   ```

5. Open the `/exec` URL: it should show `{"ok":true,"votes":0}`.

Without clasp, the same fix in the editor is: paste `apps_script.gs`, save, run `setup`, then
**Deploy → Manage deployments →** select the **Web app** deployment (not the Library one)
**→ pencil icon → Version: New version → Deploy**. Creating a *New deployment* instead gives a
new URL, which would then have to go into `docs/index.html`.

## Using it

- Participants scan the QR code, agree once, pick their code once and answer the 7 vote
  questions (about 40 s). The phone remembers the code and the one-off self-rating.
- If the phone has no connection, the vote is kept on the phone and sent automatically the
  next time the page is opened.
- Add `?preview` to the address to try the page without sending anything; the page then
  shows the data row a vote would produce.
- Each row carries `sid` (vote id), `device_id` and `duration_s` for the data-quality rules
  (duplicates, shared phones, answers completed too quickly).

## Columns in the sheet

`server_time, sid, client_time, participant, seat_zone, tsv (1 cold … 7 hot),
tpv (1 warmer, 2 no change, 3 cooler), accept (1/0), garments, clo, clo_tbc,
activity (1–4), sun, draught, stuffy, self_sens (1 much colder … 5 much warmer),
duration_s, device_id, version`

Answers are stored in the Google Sheet, never in this public repository.
