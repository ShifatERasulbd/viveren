<?php
$sourceDir = '/var/www/viveren/public/uploads/products/gallery';
$thumbDir = $sourceDir . '/thumbs';

if (!is_dir($thumbDir)) {
    mkdir($thumbDir, 0755, true);
}

$files = glob($sourceDir . '/*.{jpg,jpeg,png,JPG,JPEG,PNG}', GLOB_BRACE);
$total = count($files);
$done = 0;
$skipped = 0;

foreach ($files as $file) {
    $basename = pathinfo($file, PATHINFO_FILENAME);
    $thumbPath = $thumbDir . '/' . $basename . '.webp';

    if (file_exists($thumbPath)) {
        $skipped++;
        continue;
    }

    $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    $src = match($ext) {
        'jpg', 'jpeg' => @imagecreatefromjpeg($file),
        'png' => @imagecreatefrompng($file),
        default => null,
    };

    if (!$src) {
        echo "SKIP (unreadable): $file\n";
        continue;
    }

    $origW = imagesx($src);
    $origH = imagesy($src);
    $targetSize = 400;

    // Center-crop to square, then resize
    $cropSize = min($origW, $origH);
    $srcX = (int)(($origW - $cropSize) / 2);
    $srcY = (int)(($origH - $cropSize) / 2);

    $thumb = imagecreatetruecolor($targetSize, $targetSize);
    imagecopyresampled($thumb, $src, 0, 0, $srcX, $srcY, $targetSize, $targetSize, $cropSize, $cropSize);

    imagewebp($thumb, $thumbPath, 78);

    imagedestroy($src);
    imagedestroy($thumb);
    $done++;

    if ($done % 20 == 0) {
        echo "Progress: $done/$total\n";
    }
}

echo "\nDone. Generated: $done, Skipped (existing): $skipped, Total source files: $total\n";
