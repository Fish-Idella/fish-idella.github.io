<?php
// 设置响应头为JSON格式并指定UTF-8编码
header("Content-Type: application/json; charset=utf-8");

// 定义基础目录
$baseDir = "D:/Abacus/Android/Resources/";

// 初始化结果数组
$result = [
    'success' => false,
    'message' => '',
    'path' => '',
    'data' => []
];

// 检查是否有POST请求且包含path参数
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_POST['path'])) {
    $result['message'] = '无效请求：缺少必要参数';
    echo json_encode($result);
    exit;
}

// 过滤并清理用户输入，防止目录遍历攻击
$path = str_replace('..', '', $_POST['path']); // 移除点，防止目录遍历

// 保存相对路径
$result['path'] = $path;

// 构建完整路径
$path = $baseDir . $path;

// 检查路径是否存在且为目录
if (!is_dir($path)) {
    $result['message'] = '指定路径不存在或不是有效目录';
    echo json_encode($result);
    exit;
}

try {
    // 创建文件系统迭代器，跳过点文件
    $iterator = new FilesystemIterator($path, FilesystemIterator::SKIP_DOTS);
    
    // 存储文件信息的数组
    $files = [];
    
    foreach ($iterator as $fileinfo) {
        // 获取文件基本信息
        $fileData = [
            'name' => $fileinfo->getFilename(),
            'type' => $fileinfo->isDir() ? 'directory' : 'file',
            'size' => $fileinfo->getSize(),
            'modified' => date('Y-m-d H:i:s', $fileinfo->getMTime())
        ];
        
        // 添加到文件列表
        $files[] = $fileData;
    }
    
    // 更新结果数组
    $result['success'] = true;
    $result['message'] = '目录内容获取成功';
    $result['data'] = $files;
    
    // 输出JSON结果
    echo json_encode($result);
    
} catch (Exception $e) {
    // 记录错误日志（实际环境中应记录到日志文件）
    error_log("文件列表错误: " . $e->getMessage());
    
    // 返回友好的错误信息
    $result['message'] = '获取目录内容时出错，请稍后再试';
    echo json_encode($result);
}
?>