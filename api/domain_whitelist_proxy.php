<?php
// 安全限制：仅允许获取百度域名下的内容
$allowedDomains = ['baidu.com', 'bing.com'];

// 获取请求的URL参数
$url = $_SERVER['REQUEST_METHOD'] === 'POST' ? ($_POST['url'] ?? '') : ($_GET['url'] ?? '');

// 验证URL有效性
if (empty($url)) {
    die("错误：缺少URL参数");
}

// 解析URL并验证域名
$parsedUrl = parse_url($url);
if (!$parsedUrl || !isset($parsedUrl['host'])) {
    die("错误：无效的URL");
}

// 检查是否为允许的域名（生产环境可根据需要调整）
$isAllowed = false;
foreach ($allowedDomains as $domain) {
    if (strpos($parsedUrl['host'], $domain) !== false) {
        $isAllowed = true;
        break;
    }
}

if (!$isAllowed) {
    die("错误：不允许访问该域名");
}

// 使用cURL获取内容
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true); // 跟随重定向
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // 不验证SSL证书（生产环境需谨慎）
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 60); // 设置超时时间

// 执行请求
$content = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);

// 检查是否有错误
if (curl_errno($ch)) {
    die("错误：" . curl_error($ch));
}

curl_close($ch);

// 设置响应头
header("Content-Type: " . ($contentType ?: "text/html"));
header("HTTP/1.1 " . $httpCode);

// 输出内容
echo $content;
?>