# 婚禮出席回覆表單

Vue 3 + Vite 做的婚禮 RSVP 網頁。來賓填寫的資料會透過 Google Apps Script 寫進 Google 試算表，「統計」工作表會自動加總出席人數、素食人數和兒童椅數量。

```
來賓瀏覽器 ──POST──▶ Apps Script 網頁應用程式 ──寫入──▶ Google 試算表（回覆 / 統計）
```

## 本機開發

需要 Node.js 18 以上。

```bash
npm install
npm run dev
```

還沒設定 Apps Script 網址時，表單會進入**模擬模式**：送出後會顯示成功畫面，但資料只會印在瀏覽器 console，不會寫入試算表。模擬模式只在 `npm run dev` 時生效，正式網站沒設定網址的話會直接顯示錯誤。

婚禮資訊（新人名字、日期、地點、回覆截止日）都在 [src/config.js](src/config.js)。

## 一、設定 Google 試算表與 Apps Script

> 試算表和 Apps Script 都會存在你操作時登入的 Google 帳號。如果瀏覽器同時登入多個 Google 帳號，Apps Script 很容易出現權限錯誤，建議開**無痕視窗**、只登入要用的那個帳號再操作。

1. 到 [Google 試算表](https://sheets.google.com) 新增一份空白試算表，命名例如「婚禮出席回覆」
2. 選單「檔案 > 設定」，時區選 **(GMT+08:00) 台北**，儲存
3. 選單「擴充功能 > Apps Script」
4. 刪掉編輯器裡原本的程式碼，把 [apps-script/Code.gs](apps-script/Code.gs) 的內容整個貼上，按儲存
5. 上方函式下拉選單選 **`setup`**，按「執行」
   - 第一次會要求授權：選你的帳號 → 「進階」→「前往（未驗證）」→「允許」
   - 回到試算表，會出現「回覆」和「統計」兩個工作表
6. 右上角「部署 > 新增部署作業」
   - 類型：**網頁應用程式**
   - 執行身分：**我**
   - 誰可以存取：**所有人**
7. 按「部署」，複製「網頁應用程式網址」（以 `/exec` 結尾）

測試網址是否正常：

```bash
curl -L "貼上你的網址"
# 應該回傳 {"ok":true}
```

### 修改 Code.gs 之後

要到「部署 > 管理部署作業」→ 編輯（鉛筆圖示）→ 版本選「新版本」→ 部署，網址才會套用新的程式碼。用「新增部署作業」會產生**另一個網址**。

## 二、本機連到試算表

```bash
cp .env.example .env
```

把 `.env` 裡的 `VITE_GAS_URL=` 填上剛剛複製的網址，重新執行 `npm run dev`，送出一筆資料，確認試算表「回覆」工作表多了一列。

## 三、部署到 GitHub Pages

1. 用你的 GitHub 帳號建立一個新的 repository（名稱隨意，例如 `wedding-rsvp`，不要勾選新增 README）
2. 推送程式碼：

   ```bash
   git remote add origin https://github.com/<你的帳號>/<repo 名稱>.git
   git push -u origin main
   ```

3. repo 的 **Settings > Pages**，Source 選 **GitHub Actions**
4. repo 的 **Settings > Secrets and variables > Actions > Variables** 分頁，新增 Repository variable：
   - Name：`VITE_GAS_URL`
   - Value：Apps Script 網址
   - 這個網址本來就會出現在網頁的程式碼中，所以放在 Variables 就好，不需要放 Secrets
5. 到 **Actions** 分頁，重新執行一次「Deploy to GitHub Pages」（第一次 push 時變數還沒設定）
6. 完成後網址是 `https://<你的帳號>.github.io/<repo 名稱>/`

之後只要 push 到 `main` 就會自動重新部署。

## 試算表欄位

**回覆**：填寫時間、姓名、手機、男方/女方、是否出席、出席人數、素食人數、兒童椅、飲食禁忌或過敏

- 以**手機號碼**判斷是否重複：同一支手機再次填寫會更新原本那一列，不會多出一筆
- 選「無法出席」時，人數欄位都記為 0，飲食禁忌留空
- 飲食禁忌或過敏：來賓選「有」才會填寫內容，選「沒有」則留空

**統計**：總回覆數、出席組數、無法出席組數、出席總人數、男方 / 女方出席人數、素食總數、兒童椅總數、有飲食禁忌或過敏組數、預估桌數（每桌 10 人），以及 D 欄起的飲食禁忌或過敏來賓清單

## 專案結構

```
├─ apps-script/Code.gs          貼到 Apps Script 的後端程式
├─ public/og.jpg                分享預覽縮圖（首屏截圖，改了首屏要重截）
├─ src/
│  ├─ config.js                 婚禮資訊與選項
│  ├─ api/rsvp.js               送出資料到 Apps Script
│  ├─ components/
│  │  ├─ WeddingHero.vue        新人與婚禮資訊
│  │  ├─ RsvpForm.vue           回覆表單
│  │  ├─ NumberStepper.vue      人數加減按鈕
│  │  └─ SuccessCard.vue        送出成功畫面
│  └─ styles/main.css           色票與 RWD 版面
└─ .github/workflows/deploy.yml GitHub Pages 自動部署
```
