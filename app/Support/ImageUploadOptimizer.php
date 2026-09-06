<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;

class ImageUploadOptimizer
{
    /**
     * Resize (down only, preserving aspect ratio) and re-encode an uploaded image as WebP
     * under public/{relativeDirectory}, returning its public path. Falls back to storing the
     * original file unmodified if GD can't decode it or WebP support isn't available.
     */
    public function storeAsWebp(
        UploadedFile $file,
        string $relativeDirectory,
        string $filenamePrefix = '',
        int $maxWidth = 0,
        int $maxHeight = 0,
        int $quality = 82,
    ): string {
        $relativeDirectory = trim($relativeDirectory, '/');
        $directory = public_path($relativeDirectory);

        if (! File::exists($directory)) {
            File::makeDirectory($directory, 0755, true);
        }

        $baseName = $filenamePrefix . now()->format('YmdHis') . '-' . bin2hex(random_bytes(5));
        $source = $this->readImage($file->getRealPath(), strtolower((string) $file->getClientOriginalExtension()));

        if ($source === null || ! function_exists('imagewebp')) {
            return $this->storeOriginal($file, $directory, $relativeDirectory, $baseName);
        }

        $resized = null;

        try {
            $resized = $this->resizeToFit($source, $maxWidth, $maxHeight);
            $filename = $baseName . '.webp';
            imagewebp($resized, $directory . DIRECTORY_SEPARATOR . $filename, max(0, min(100, $quality)));

            return '/' . $relativeDirectory . '/' . $filename;
        } finally {
            imagedestroy($source);
            if ($resized !== null && $resized !== $source) {
                imagedestroy($resized);
            }
        }
    }

    /** @return \GdImage|null */
    private function readImage(string $path, string $extension)
    {
        return match ($extension) {
            'jpg', 'jpeg' => @imagecreatefromjpeg($path),
            'png' => @imagecreatefrompng($path),
            'gif' => @imagecreatefromgif($path),
            'webp' => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($path) : null,
            'bmp' => function_exists('imagecreatefrombmp') ? @imagecreatefrombmp($path) : null,
            default => null,
        } ?: null;
    }

    /** @return \GdImage */
    private function resizeToFit($image, int $maxWidth, int $maxHeight)
    {
        $width = imagesx($image);
        $height = imagesy($image);

        if ($maxWidth <= 0 || $maxHeight <= 0 || ($width <= $maxWidth && $height <= $maxHeight)) {
            return $image;
        }

        $scale = min($maxWidth / $width, $maxHeight / $height);
        $targetWidth = max(1, (int) round($width * $scale));
        $targetHeight = max(1, (int) round($height * $scale));

        $resized = imagecreatetruecolor($targetWidth, $targetHeight);
        imagealphablending($resized, false);
        imagesavealpha($resized, true);
        imagecopyresampled($resized, $image, 0, 0, 0, 0, $targetWidth, $targetHeight, $width, $height);

        return $resized;
    }

    private function storeOriginal(UploadedFile $file, string $directory, string $relativeDirectory, string $baseName): string
    {
        $extension = strtolower((string) $file->getClientOriginalExtension());
        $filename = $baseName . ($extension !== '' ? '.' . $extension : '');
        $file->move($directory, $filename);

        return '/' . $relativeDirectory . '/' . $filename;
    }
}
