<?php
/**
 * Contact Form Handler
 * Sends form submissions via SMTP to the practice email.
 */

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

header('Content-Type: application/json');

// --- SMTP Configuration ---
$smtpHost     = 'smtp.stackmail.com';
$smtpPort     = 587;
$smtpUser     = 'no-reply@candicegaugaincounselling.co.uk';
$smtpPass     = 'NRLogmein$7';
$fromEmail    = 'no-reply@candicegaugaincounselling.co.uk';
$fromName     = 'Candice Gaugain Website';
$toEmail      = 'candicegaugaincounselling@gmail.com';

// --- Sanitise & Validate Input ---
$name    = trim(strip_tags($_POST['name'] ?? ''));
$phone   = trim(strip_tags($_POST['phone'] ?? ''));
$email   = trim(strip_tags($_POST['email'] ?? ''));
$message = trim(strip_tags($_POST['message'] ?? ''));

$errors = [];
if ($name === '')    $errors[] = 'Name is required.';
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'A valid email address is required.';
if ($message === '') $errors[] = 'Message is required.';

if (!empty($errors)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => implode(' ', $errors)]);
    exit;
}

// --- Rate limiting (simple file-based, 1 submission per IP per 60s) ---
$rateLimitDir = __DIR__ . '/rate-limit';
if (!is_dir($rateLimitDir)) {
    @mkdir($rateLimitDir, 0700, true);
}

$ipHash = md5($_SERVER['REMOTE_ADDR'] ?? 'unknown');
$lockFile = $rateLimitDir . '/' . $ipHash;

if (file_exists($lockFile) && (time() - filemtime($lockFile)) < 60) {
    http_response_code(429);
    echo json_encode(['success' => false, 'message' => 'Please wait a moment before sending another message.']);
    exit;
}

// --- Build Email ---
$subject = "New Enquiry from {$name} — Website Contact Form";

$htmlBody = "
<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
    <div style='background: #4a5d4a; color: #fff; padding: 20px 24px; border-radius: 8px 8px 0 0;'>
        <h2 style='margin: 0; font-size: 18px;'>New Website Enquiry</h2>
    </div>
    <div style='background: #faf8f4; padding: 24px; border: 1px solid #dce6d8; border-top: none; border-radius: 0 0 8px 8px;'>
        <table style='width: 100%; border-collapse: collapse;'>
            <tr>
                <td style='padding: 8px 0; color: #6b7268; font-size: 13px; width: 100px; vertical-align: top;'><strong>Name</strong></td>
                <td style='padding: 8px 0; color: #2c3029;'>" . htmlspecialchars($name) . "</td>
            </tr>
            <tr>
                <td style='padding: 8px 0; color: #6b7268; font-size: 13px; vertical-align: top;'><strong>Email</strong></td>
                <td style='padding: 8px 0; color: #2c3029;'><a href='mailto:" . htmlspecialchars($email) . "' style='color: #4a5d4a;'>" . htmlspecialchars($email) . "</a></td>
            </tr>
            <tr>
                <td style='padding: 8px 0; color: #6b7268; font-size: 13px; vertical-align: top;'><strong>Phone</strong></td>
                <td style='padding: 8px 0; color: #2c3029;'>" . ($phone ? htmlspecialchars($phone) : '<em style=\"color:#999;\">Not provided</em>') . "</td>
            </tr>
        </table>
        <hr style='border: none; border-top: 1px solid #dce6d8; margin: 16px 0;'>
        <p style='color: #6b7268; font-size: 13px; margin: 0 0 6px;'><strong>Message</strong></p>
        <p style='color: #2c3029; line-height: 1.6; margin: 0; white-space: pre-wrap;'>" . htmlspecialchars($message) . "</p>
    </div>
    <p style='color: #999; font-size: 11px; text-align: center; margin-top: 16px;'>Sent from the contact form at candicegaugaincounselling.co.uk</p>
</div>
";

$textBody = "New Website Enquiry\n"
    . "---\n"
    . "Name: {$name}\n"
    . "Email: {$email}\n"
    . "Phone: " . ($phone ?: 'Not provided') . "\n"
    . "---\n"
    . "Message:\n{$message}\n";

// --- Send via SMTP ---
$boundary = md5(uniqid(time()));

$headers  = "From: {$fromName} <{$fromEmail}>\r\n";
$headers .= "Reply-To: {$name} <{$email}>\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: multipart/alternative; boundary=\"{$boundary}\"\r\n";

$mimeBody  = "--{$boundary}\r\n";
$mimeBody .= "Content-Type: text/plain; charset=UTF-8\r\n";
$mimeBody .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
$mimeBody .= $textBody . "\r\n";
$mimeBody .= "--{$boundary}\r\n";
$mimeBody .= "Content-Type: text/html; charset=UTF-8\r\n";
$mimeBody .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
$mimeBody .= $htmlBody . "\r\n";
$mimeBody .= "--{$boundary}--\r\n";

$sent = smtpSend($smtpHost, $smtpPort, $smtpUser, $smtpPass, $fromEmail, $toEmail, $subject, $mimeBody, $headers);

if ($sent === true) {
    @touch($lockFile); // rate limit stamp
    echo json_encode(['success' => true, 'message' => 'Thank you, ' . $name . '! Your message has been sent. Candice will be in touch soon.']);
} else {
    http_response_code(500);
    error_log("Contact form SMTP error: " . $sent);
    echo json_encode(['success' => false, 'message' => 'Sorry, there was a problem sending your message. Please try calling 07946 820 704 or emailing candicegaugaincounselling@gmail.com directly.']);
}

// --- Minimal SMTP sender with STARTTLS ---
function smtpSend($host, $port, $user, $pass, $from, $to, $subject, $body, $headers) {
    $smtp = @fsockopen($host, $port, $errno, $errstr, 10);
    if (!$smtp) return "Connection failed: {$errstr} ({$errno})";

    $response = fgets($smtp, 512);
    if (substr($response, 0, 3) !== '220') return "Unexpected greeting: {$response}";

    // EHLO
    fwrite($smtp, "EHLO " . gethostname() . "\r\n");
    $response = smtpReadMultiline($smtp);

    // STARTTLS
    fwrite($smtp, "STARTTLS\r\n");
    $response = fgets($smtp, 512);
    if (substr($response, 0, 3) !== '220') return "STARTTLS failed: {$response}";

    $crypto = stream_socket_enable_crypto($smtp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
    if (!$crypto) return "TLS negotiation failed";

    // EHLO again after TLS
    fwrite($smtp, "EHLO " . gethostname() . "\r\n");
    $response = smtpReadMultiline($smtp);

    // AUTH LOGIN
    fwrite($smtp, "AUTH LOGIN\r\n");
    $response = fgets($smtp, 512);
    if (substr($response, 0, 3) !== '334') return "AUTH failed: {$response}";

    fwrite($smtp, base64_encode($user) . "\r\n");
    $response = fgets($smtp, 512);
    if (substr($response, 0, 3) !== '334') return "Username rejected: {$response}";

    fwrite($smtp, base64_encode($pass) . "\r\n");
    $response = fgets($smtp, 512);
    if (substr($response, 0, 3) !== '235') return "Authentication failed: {$response}";

    // MAIL FROM
    fwrite($smtp, "MAIL FROM:<{$from}>\r\n");
    $response = fgets($smtp, 512);
    if (substr($response, 0, 3) !== '250') return "MAIL FROM rejected: {$response}";

    // RCPT TO
    fwrite($smtp, "RCPT TO:<{$to}>\r\n");
    $response = fgets($smtp, 512);
    if (substr($response, 0, 3) !== '250') return "RCPT TO rejected: {$response}";

    // DATA
    fwrite($smtp, "DATA\r\n");
    $response = fgets($smtp, 512);
    if (substr($response, 0, 3) !== '354') return "DATA rejected: {$response}";

    // Compose full message
    $data  = "To: {$to}\r\n";
    $data .= "Subject: {$subject}\r\n";
    $data .= "Date: " . date('r') . "\r\n";
    $data .= $headers;
    $data .= "\r\n";
    $data .= $body;
    $data .= "\r\n.\r\n";

    fwrite($smtp, $data);
    $response = fgets($smtp, 512);
    if (substr($response, 0, 3) !== '250') return "Message rejected: {$response}";

    // QUIT
    fwrite($smtp, "QUIT\r\n");
    fclose($smtp);

    return true;
}

function smtpReadMultiline($smtp) {
    $response = '';
    while ($line = fgets($smtp, 512)) {
        $response .= $line;
        if (substr($line, 3, 1) === ' ') break;
    }
    return $response;
}
