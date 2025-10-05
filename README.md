# 個人網頁（Chiang, Chenwei）

這個 repository 儲存與管理我的個人網站原始碼（靜態 HTML/CSS/JS），並包含最近的 SEO 與 sitemap 調整。

最後更新：2025-10-05

主要變更摘要
- 修正 `sitemap.xml`（移除重複的 XML 宣告與多餘的 `<urlset>`，避免瀏覽器/解析器錯誤）。
- 新增/更新 SEO 相關內容：`index.html` head 的 meta、Open Graph、Twitter Card 與 JSON-LD（Person / WebSite / WebPage / CreativeWork）。
- 新增 `robots.txt`（包含 sitemap 指向）。
- 圖片優化建議（lazy-loading、width/height、建議轉換為 WebP/AVIF）。
- 已中止/移除音效模組（`js/audio.js` 與前端音效控制 UI 已 neutralize），以避免自動播放/可存取性問題。

重要檔案
- `index.html` — 首頁與主要 SEO/JSON-LD。
- `css/style.css` — 版面樣式。
- `js/main.js`, `js/audio.js` — 前端互動；`audio.js` 目前已 neutralize。
- `sitemap.xml` — XML sitemap，請上傳到網站根目錄（/sitemap.xml）。
- `robots.txt` — robots 指令，請上傳到網站根目錄（/robots.txt）。
- `SEO_GUIDE.md` — 提交 sitemap、GSC 驗證與影像轉換建議。

關於作者

江振維（Chiang, Chenwei）為國立臺北商業大學創意科技與產品設計系助理教授，長期從事互動設計與新媒體藝術的創作與教學。其作品聚焦於感性科技、互動裝置與植物感知等跨域實作，並結合人工智慧與工業設計的方法論來探討使用者經驗與共生議題。代表作品包括《行動裝置》、《意識行動》與《植生。虛與實》，同時積極將研究成果融入課程與學生專題，推動創新教學與跨領域合作。

本地開發

1. (可選) 使用 Docker: 若要模擬伺服器或 PHP 代理功能，可使用 `docker compose up --build -d`。
2. 直接靜態預覽: 開啟 `index.html` 或使用簡單的靜態伺服器，例如：

```bash
# 使用 Python 3 的簡單 HTTP server
python3 -m http.server 8080

# 然後在瀏覽器開啟
# http://localhost:8080
```

部署到網站（最小要上傳的檔案）

- `index.html`
- `css/` 目錄
- `js/` 目錄
- `images/` 目錄（包含 OG 與作品圖）
- `sitemap.xml`（放在網站根目錄：`https://interaction.tw/sitemap.xml`）
- `robots.txt`（放在網站根目錄：`https://interaction.tw/robots.txt`）

推送到 GitHub（快速參考）

```bash
git add -A
git commit -m "fix: sitemap and SEO updates"
git push origin main    # 若被拒：請確認是否要使用 --force（會覆寫遠端歷史）
```

如果您想保守處理遠端衝突，先 `git pull --rebase origin main` 再 push。

上線後驗證（建議）

1. 確認 `https://interaction.tw/sitemap.xml` 可存取且開頭是 `<?xml version="1.0" encoding="UTF-8"?>`。
2. 用 Google Search Console 提交 sitemap。  
3. 在 Rich Results Test 與 URL Inspection 中測試主要頁面和 JSON-LD。  
4. 用 Lighthouse（Chrome DevTools）測試效能與最佳實務，並優化影像（WebP/AVIF）與快取標頭。

影像優化建議
- 轉換大圖為 WebP/AVIF，並在 `srcset` 中提供多解析度檔案。  
- 保留 `width` / `height` 屬性避免 Cumulative Layout Shift (CLS)。  
- 使用 `loading="lazy"` 與 `decoding="async"` 對非首屏影像啟用延遲載入。

回溯/備份

- 本地有一個備份分支 `main.backup`（指向先前的 SEO commit）。若需恢復可執行：

```bash
# 回到備份（本地）：
git checkout main
git reset --hard main.backup

# 若要把該狀態推回 origin（注意：可能會使用 --force）：
git push origin main --force
```

聯絡與授權

如果您要我代為上傳 `sitemap.xml` 與 `robots.txt` 或直接把目前版本推上 GitHub（包含 force push），請先在對話中明確授權我執行那些操作。我已經在本地完成測試並可協助後續部署步驟。

---

謝謝，若要我把 README 再加上更詳細的部署腳本或 CI/CD 工作流程（GitHub Actions/Netlify 等），我可以接著幫您建立範例工作檔。
