<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'vendor/autoload.php';

function sendTestEmail($recipient) {
    $mail = new PHPMailer(true);
    
    try {
        // 使用本地测试邮件服务器 (如MailHog)
        $mail->isSMTP();
        $mail->Host = 'localhost';
        $mail->Port = 1025;
        $mail->SMTPAuth = false;
        
        $mail->setFrom('test@example.com', '测试发件人');
        $mail->addAddress($recipient);
        
        $mail->Subject = '测试邮件';
        $mail->Body = '这是一封测试邮件';
        
        return $mail->send();
    } catch (Exception $e) {
        return false;
    }
}

// 测试发送
$testEmail = 'pu_kun@foxmail.com';
if (sendTestEmail($testEmail)) {
    echo "测试邮件已发送至 {$testEmail}";
} else {
    echo "测试邮件发送失败";
}
?>
