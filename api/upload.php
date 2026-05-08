<?php
header('Content-Type: application/json; charset=utf-8');

// 1. 配置项
$savePath = __DIR__ . "/../mediae/images/"; // 服务器保存目录
$maxSize = 5 * 1024 * 1024; // 最大5M
$allowExt = ['jpg', 'jpeg', 'png', 'gif', 'webp']; // 允许的图片后缀

// 2. 创建目录（不存在则自动创建）
if (!is_dir($savePath)) {
    mkdir($savePath, 0755, true);
}

// 3. 判断是否有上传文件
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['type' => 0, 'message' => '未选择文件或上传失败']);
    exit;
}

$file = $_FILES['file'];

// 4. 验证大小
if ($file['size'] > $maxSize) {
    echo json_encode(['type' => 0, 'message' => '文件过大，最大允许5M']);
    exit;
}

// 5. 获取后缀
$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
if (!in_array($ext, $allowExt)) {
    echo json_encode(['type' => 0, 'message' => '不支持的文件类型']);
    exit;
}

// 6. 生成唯一文件名：hash + 后缀（符合你要求）
$hash = md5_file($file['tmp_name']); // 文件内容hash
$fileName = $hash . '.' . $ext;
$destination = $savePath . $fileName;

// 7. 移动到目标目录
if (move_uploaded_file($file['tmp_name'], $destination)) {
    // 成功：返回 hash+后缀 文件名
    echo json_encode([
        'type' => 1,
        'message' => $fileName
    ]);
} else {
    echo json_encode([
        'type' => 0,
        'message' => '文件保存失败，权限不足或目录错误'
    ]);
}
?>