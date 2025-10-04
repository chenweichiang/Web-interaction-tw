<?php
// 設定回應內容類型為 JSON
header('Content-Type: application/json');
error_reporting(0); // 關閉錯誤報告，避免將 PHP 錯誤直接輸出到 JSON 回應中

// --- 設定 ---
// 重要：請將您的 API 金鑰設定為伺服器的環境變數 'GEMINI_API_KEY'
// 這是最安全的方式。請查詢您的主機提供商如何設定環境變數。
$apiKey = getenv('AIzaSyCgXta4Qut01EdlGlhTRyNHzOTEPsheZac');

// 如果無法從環境變數取得金鑰，則顯示錯誤並退出
if (!$apiKey) {
    http_response_code(500); // 內部伺服器錯誤
    echo json_encode(['error' => '錯誤：伺服器未設定 Gemini API 金鑰。請設定 GEMINI_API_KEY 環境變數。']);
    exit;
}

// Gemini API 端點 (您可以根據需要調整模型，例如 gemini-1.5-flash)
$apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' . $apiKey;

// --- 從前端獲取 Prompt ---
// 確保請求方法是 POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // 方法不允許
    echo json_encode(['error' => '無效的請求方法。僅允許 POST。']);
    exit;
}

// 獲取原始 POST 資料
$rawData = file_get_contents('php://input');
$requestData = json_decode($rawData, true);

// 檢查 prompt 是否存在且不為空
if (!isset($requestData['prompt']) || empty(trim($requestData['prompt']))) {
    http_response_code(400); // 錯誤請求
    echo json_encode(['error' => '請求主體中缺少或空的 "prompt"。']);
    exit;
}

$prompt = trim($requestData['prompt']);

// --- 準備請求給 Gemini API ---
$data = [
    'contents' => [
        [
            'parts' => [
                ['text' => $prompt]
            ]
        ]
    ],
    // 可選：如果需要，可以加入 generationConfig
    // 'generationConfig' => [
    //     'temperature' => 0.7,
    //     'maxOutputTokens' => 256,
    // ]
];
$jsonData = json_encode($data);

// --- 使用 cURL 發起 API 呼叫 ---
$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); // 將回應作為字串返回，而不是直接輸出
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']); // 設定請求標頭
curl_setopt($ch, CURLOPT_POST, true); // 設定為 POST 請求
curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonData); // 設定 POST 的資料
curl_setopt($ch, CURLOPT_TIMEOUT, 45); // 設定超時時間（秒）
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true); // 驗證 SSL 憑證
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2); // 檢查 SSL 主機名

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE); // 獲取 HTTP 狀態碼
$curlError = curl_error($ch); // 獲取 cURL 錯誤訊息
curl_close($ch);

// --- 處理回應 ---
// 檢查 cURL 是否發生錯誤
if ($curlError) {
    http_response_code(500);
    // 不要在生產環境中直接顯示詳細的 cURL 錯誤給使用者
    error_log('cURL Error calling Gemini: ' . $curlError); // 記錄錯誤到伺服器日誌
    echo json_encode(['error' => '呼叫 Gemini API 時發生內部錯誤 (cURL)。']);
    exit;
}

// 檢查 Gemini API 是否返回錯誤狀態碼
if ($httpCode >= 400) {
    http_response_code($httpCode); // 將 Gemini 的錯誤碼轉發給前端
    $errorResponse = json_decode($response, true);
    // 記錄詳細錯誤到伺服器日誌
    error_log('Gemini API Error (' . $httpCode . '): ' . $response);
    echo json_encode([
        'error' => 'Gemini API 返回錯誤。',
        // 可以選擇性地傳回部分錯誤資訊，但要小心不要洩漏敏感資訊
        'details' => isset($errorResponse['error']['message']) ? $errorResponse['error']['message'] : '無法解析錯誤詳情。'
    ]);
    exit;
}

// --- 成功：將 Gemini 回應返回給前端 ---
// 解碼來自 Gemini 的回應
$responseData = json_decode($response, true);

// 提取生成的文本 (結構可能因模型/回應略有不同)
$generatedText = '錯誤：無法從 Gemini 回應中提取文本。'; // 預設錯誤訊息
if (isset($responseData['candidates'][0]['content']['parts'][0]['text'])) {
    $generatedText = $responseData['candidates'][0]['content']['parts'][0]['text'];
} elseif (isset($responseData['error']['message'])) {
    // 如果 Gemini 在 200 OK 中返回錯誤訊息
    $generatedText = 'Gemini 錯誤訊息: ' . $responseData['error']['message'];
    error_log('Gemini reported error within 200 OK: ' . $response);
} else {
    // 記錄未預期的回應結構
    error_log('Unexpected Gemini response structure: ' . $response);
}

// 只返回生成的文本 (如果需要，可以修改為返回完整回應)
echo json_encode(['generated_text' => $generatedText]);

?>
