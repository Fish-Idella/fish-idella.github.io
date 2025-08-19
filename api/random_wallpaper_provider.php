<?php
// 配置壁纸目录路径
$wallpaperDir = __DIR__ . "/../mediae/images/";

// 检查目录是否存在
if (!is_dir($wallpaperDir)) {
    die("壁纸目录不存在");
}

// 获取目录中的所有图片文件
$imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
$wallpapers = [];

$dirIterator = new DirectoryIterator($wallpaperDir);
foreach ($dirIterator as $fileInfo) {
    if ($fileInfo->isFile() && in_array(strtolower($fileInfo->getExtension()), $imageExtensions)) {
        $wallpapers[] = $fileInfo->getFilename();
    }
}

// 检查是否有壁纸
if (empty($wallpapers)) {
    die("未找到壁纸文件");
}

// 随机选择一张壁纸
$randomWallpaper = $wallpapers[array_rand($wallpapers)];
$wallpaperPath = $wallpaperDir . $randomWallpaper;

// 获取图片MIME类型
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $wallpaperPath);
finfo_close($finfo);

// 设置响应头并输出图片
header('Content-Type: ' . $mimeType);
header('Content-Disposition: inline; filename="' . $randomWallpaper . '"');
readfile($wallpaperPath);
?>    