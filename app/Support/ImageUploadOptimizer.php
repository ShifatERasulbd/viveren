<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;

class ImageUploadOptimizer
{
    /**
     * Widths of the downsized WebP copies the storefront loads instead of full-size uploads.
     * Keep in sync with VARIANT_WIDTHS in resources/js/frontend/utils/imageVariants.js.
     */
    public const RESIZED_WIDTHS = [480, 960, 2000];

    private const RESIZED_DIRECTORY = 'uploads/resized';

    /**
     * Write downsized WebP copies of an uploaded image (e.g. /uploads/products/gallery/a.jpg)
     * to public/uploads/resized/{width}/products/gallery/a.jpg.webp. Copies are never upscaled,
     * and up-to-date copies are skipped unless $force. Returns how many copies were written.
     */
    public function createResizedCopies(string $publicPath, bool $force = false): int
    {
        $relativePath = $this->uploadsRelativePath($publicPath);
        if ($relativePath === null || ! function_exists('imagewebp')) {
            return 0;
        }

        $sourcePath = public_path('uploads/' . $relativePath);
        if (! File::isFile($sourcePath)) {
            return 0;
        }

        $sourceModified = File::lastModified($sourcePath);
        $pending = array_filter(self::RESIZED_WIDTHS, function (int $width) use ($relativePath, $sourceModified, $force) {
            $target = $this->resizedFilePath($relativePath, $width);

            return $force || ! File::isFile($target) || File::lastModified($target) < $sourceModified;
        });

        if ($pending === []) {
            return 0;
        }

        // Full-size camera photos need far more than the default 128M once decoded.
        if ((int) ini_get('memory_limit') !== -1) {
            @ini_set('memory_limit', '1024M');
        }

        $source = $this->readImage($sourcePath, strtolower(pathinfo($sourcePath, PATHINFO_EXTENSION)));
        if ($source === null) {
            return 0;
        }

        // imagewebp() rejects palette images (common for PNGs)
        if (! imageistruecolor($source)) {
            imagepalettetotruecolor($source);
        }
        imagealphablending($source, false);
        imagesavealpha($source, true);

        $source = $this->applyExifOrientation($source, $sourcePath);
        $written = 0;

        try {
            foreach ($pending as $width) {
                $target = $this->resizedFilePath($relativePath, $width);
                File::ensureDirectoryExists(dirname($target), 0755);

                $resized = $this->resizeToFit($source, $width, PHP_INT_MAX);
                imagewebp($resized, $target, 78);
                if ($resized !== $source) {
                    imagedestroy($resized);
                }
                $written++;
            }
        } finally {
            imagedestroy($source);
        }

        return $written;
    }

    public function deleteResizedCopies(string $publicPath): void
    {
        $relativePath = $this->uploadsRelativePath($publicPath);
        if ($relativePath === null) {
            return;
        }

        foreach (self::RESIZED_WIDTHS as $width) {
            File::delete($this->resizedFilePath($relativePath, $width));
        }
    }

    /** Path below public/uploads for raster images that get resized copies, or null. */
    private function uploadsRelativePath(string $publicPath): ?string
    {
        $path = ltrim(str_replace('\\', '/', trim($publicPath)), '/');

        if (! str_starts_with($path, 'uploads/')
            || str_starts_with($path, self::RESIZED_DIRECTORY . '/')
            || str_contains($path, '..')
            || ! preg_match('/\.(jpe?g|png|webp)$/i', $path)) {
            return null;
        }

        return substr($path, strlen('uploads/'));
    }

    private function resizedFilePath(string $relativePath, int $width): string
    {
        return public_path(self::RESIZED_DIRECTORY . '/' . $width . '/' . $relativePath . '.webp');
    }

    /**
     * Browsers rotate JPEGs by their EXIF orientation tag but GD does not, so apply it here.
     *
     * @param  \GdImage  $image
     * @return \GdImage
     */
    private function applyExifOrientation($image, string $path)
    {
        if (! function_exists('exif_read_data') || ! preg_match('/\.jpe?g$/i', $path)) {
            return $image;
        }

        $orientation = (int) (@exif_read_data($path)['Orientation'] ?? 1);
        $angle = match ($orientation) {
            3 => 180,
            6 => -90,
            8 => 90,
            default => 0,
        };

        if ($angle === 0) {
            return $image;
        }

        $rotated = imagerotate($image, $angle, 0);
        if ($rotated === false) {
            return $image;
        }

        imagedestroy($image);

        return $rotated;
    }

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
