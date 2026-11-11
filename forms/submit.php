<?php
/**
 * Mum Talks – form handler for the static site.
 * Handles the newsletter sign-up ("Get Empowered") and the contact /
 * partner-with-us forms that used to be Contact Form 7.
 *
 *  - Every submission is appended to forms/data/submissions.csv (blocked from the web by .htaccess)
 *  - An email is sent to the address set in config.php
 *  - Newsletter sign-ups are optionally added to Mailchimp (set the keys in config.php)
 */
declare(strict_types=1);
$config = require __DIR__ . '/config.php';

$wantsJson = stripos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;
function respond(bool $ok, string $message, bool $json): void {
    if ($json) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok, 'status' => $ok ? 'mail_sent' : 'mail_failed', 'message' => $message]);
    } else {
        $back = $_SERVER['HTTP_REFERER'] ?? '/';
        $back = preg_replace('/([?&])mt_sent=\d/', '', $back);
        $back .= (strpos($back, '?') === false ? '?' : '&') . 'mt_sent=' . ($ok ? '1' : '0');
        header('Location: ' . $back, true, 303);
    }
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    respond(false, 'Method not allowed.', true);
}

// --- very small rate limit: 10 submissions per IP per hour ---
$dataDir = __DIR__ . '/data';
if (!is_dir($dataDir)) { @mkdir($dataDir, 0750, true); }
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rlFile = $dataDir . '/rate-' . md5($ip) . '.json';
$hits = is_file($rlFile) ? (json_decode((string)file_get_contents($rlFile), true) ?: []) : [];
$hits = array_values(array_filter($hits, fn($t) => $t > time() - 3600));
if (count($hits) >= 10) { respond(false, 'Too many submissions – please try again a little later.', $wantsJson); }
$hits[] = time();
@file_put_contents($rlFile, json_encode($hits));

// --- collect fields (skip CF7 plumbing) ---
$fields = [];
foreach ($_POST as $k => $v) {
    if (strpos((string)$k, '_wpcf7') === 0 || strpos((string)$k, '_mc4wp') === 0) continue;
    if (is_array($v)) $v = implode(', ', array_map('strval', $v));
    $fields[(string)$k] = trim(mb_substr((string)$v, 0, 5000));
}
$formId = (string)($_POST['_wpcf7'] ?? '');
$isNewsletter = $formId === '85' || isset($_POST['checkbox']);
$formName = $isNewsletter ? 'Newsletter sign-up' : ($formId === '94' ? 'Contact form' : 'Website form');

$email = $fields['email'] ?? $fields['your-email'] ?? '';
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(false, 'Please enter a valid email address.', $wantsJson);
}
foreach ($fields as $k => $v) {           // block header injection
    if (preg_match("/[\r\n]/", $v) && !in_array($k, ['Message', 'message', 'your-message'], true)) {
        respond(false, 'Invalid input.', $wantsJson);
    }
}

// --- store ---
$csv = $dataDir . '/submissions.csv';
$fh = fopen($csv, 'a');
if ($fh) {
    flock($fh, LOCK_EX);
    fputcsv($fh, [date('c'), $formName, $ip, json_encode($fields, JSON_UNESCAPED_UNICODE)]);
    flock($fh, LOCK_UN);
    fclose($fh);
}

// --- Mailchimp (optional) ---
if ($isNewsletter && $config['mailchimp_api_key'] && $config['mailchimp_list_id']) {
    $dc = substr(strrchr($config['mailchimp_api_key'], '-') ?: '-us1', 1);
    $url = "https://{$dc}.api.mailchimp.com/3.0/lists/{$config['mailchimp_list_id']}/members/" . md5(strtolower($email));
    $tags = array_values(array_filter(array_map('trim', explode(',', $fields['checkbox'] ?? ''))));
    $payload = json_encode(['email_address' => $email, 'status_if_new' => $config['mailchimp_double_optin'] ? 'pending' : 'subscribed']);
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_CUSTOMREQUEST => 'PUT', CURLOPT_POSTFIELDS => $payload, CURLOPT_RETURNTRANSFER => true,
        CURLOPT_USERPWD => 'mt:' . $config['mailchimp_api_key'], CURLOPT_HTTPHEADER => ['Content-Type: application/json'], CURLOPT_TIMEOUT => 10]);
    curl_exec($ch);
    curl_close($ch);
    if ($tags) {
        $ch = curl_init($url . '/tags');
        curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_USERPWD => 'mt:' . $config['mailchimp_api_key'],
            CURLOPT_POSTFIELDS => json_encode(['tags' => array_map(fn($t) => ['name' => $t, 'status' => 'active'], $tags)]),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'], CURLOPT_TIMEOUT => 10]);
        curl_exec($ch);
        curl_close($ch);
    }
}

// --- email ---
$body = "New {$formName} from mumtalks.ie\n\n";
foreach ($fields as $k => $v) { $body .= ucfirst(str_replace(['_', '-'], ' ', $k)) . ": {$v}\n"; }
$body .= "\nSent " . date('j M Y H:i') . " from {$ip}\n";
$headers = [
    'From: ' . $config['from_email'],
    'Reply-To: ' . $email,
    'Content-Type: text/plain; charset=UTF-8',
];
$sent = @mail($config['to_email'], "[Mum Talks] {$formName}", $body, implode("\r\n", $headers));

// The submission is saved even if the server can't send mail, so treat that as success.
respond(true, $isNewsletter ? 'Thank you for subscribing! Keep an eye on your inbox.' : 'Thank you for your message. It has been sent.', $wantsJson);
