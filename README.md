# 個人網頁

這是 Chiang, Chenwei 的個人網頁。

## 功能

*   展示個人簡介、學經歷、展覽經歷。
*   包含動態背景效果。
*   (可選) 使用 PHP 代理安全地呼叫 Google Gemini API。

## 本地開發與測試 (使用 Docker)

1.  **安裝 Docker Desktop:** 確保你的電腦已安裝 Docker Desktop。
2.  **建立 `.env` 檔案:** 在專案根目錄建立一個 `.env` 檔案，並加入你的 Google Gemini API 金鑰：
    ```env
    GEMINI_API_KEY=你的實際Google_Gemini_API金鑰貼在這裡
    ```
3.  **建構並啟動容器:** 在專案根目錄的終端機中執行：
    ```bash
    docker compose up --build -d
    ```
4.  **訪問網頁:** 在瀏覽器中開啟 `http://localhost:8080`。
5.  **停止容器:** 測試完畢後，在終端機中執行：
    ```bash
    docker compose down
    ```

## 部署

*   **靜態檔案:** 將 `index.html`, `css/`, `js/`, `images/` 目錄下的檔案上傳到任何靜態網頁主機。
*   **PHP 代理 (如果使用 Gemini API):**
    *   將 `gemini-proxy.php` 上傳到支援 PHP 的主機空間。
    *   在主機環境中設定名為 `GEMINI_API_KEY` 的環境變數，值為你的 API 金鑰。
    *   確保前端 JavaScript 中的 `proxyUrl` 指向正確的 `gemini-proxy.php` 路徑。
