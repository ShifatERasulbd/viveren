<?php

namespace App\Http\Controllers;

use App\Models\Settings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;

class TrendingSectionController extends Controller
{
    private const DEFAULT_IMAGE = '/uploads/trending/default.webp';


    private function ensureSettings(): Settings
    {
        $setting = Settings::orderBy('id', 'desc')->first();

        if (! $setting) {
            $setting = Settings::create(['payload' => []]);
        }

        return $setting;
    }

    private function getFrontendUtils(Settings $setting): array
    {
        $payload = is_array($setting->payload) ? $setting->payload : [];
        $frontendUtils = is_array($payload['frontend_utils'] ?? null) ? $payload['frontend_utils'] : [];

        return $frontendUtils;
    }

    public function publicIndex(): JsonResponse
    {
        $setting = Settings::orderBy('id', 'desc')->first();

        $frontendUtils = $setting ? $this->getFrontendUtils($setting) : [];
        $trending = is_array($frontendUtils['trending_section'] ?? null)
            ? $frontendUtils['trending_section']
            : [];

        $image = is_string($trending['image'] ?? null) ? trim((string) $trending['image']) : '';

        return response()->json([
            'trending_section' => [
                'image' => $image !== '' ? $image : self::DEFAULT_IMAGE,
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'trending_image_existing' => 'nullable|string|max:2048',
            'trending_image_file' => 'nullable|file|mimes:jpeg,jpg,png,webp,svg,avif,gif|max:8192',
        ]);

        $settings = $this->ensureSettings();
        $frontendUtils = $this->getFrontendUtils($settings);
        $existingTrending = is_array($frontendUtils['trending_section'] ?? null)
            ? $frontendUtils['trending_section']
            : [];

        $image = is_string($validated['trending_image_existing'] ?? null)
            ? trim((string) $validated['trending_image_existing'])
            : (is_string($existingTrending['image'] ?? null) ? trim((string) $existingTrending['image']) : '');

        if ($request->hasFile('trending_image_file')) {
            $file = $request->file('trending_image_file');

            if ($image !== '') {
                $this->deleteUploadedImageIfLocal($image);
            }

            $image = $this->storeUploadedImageToPublic($file, 'uploads/trending', 'trending_');
        }

        $frontendUtils['trending_section'] = [
            'image' => $image !== '' ? $image : self::DEFAULT_IMAGE,
        ];

        $payload = is_array($settings->payload) ? $settings->payload : [];
        $payload['frontend_utils'] = $frontendUtils;
        $settings->update(['payload' => $payload]);

        return response()->json([
            'trending_section' => $frontendUtils['trending_section'],
        ]);
    }

    private function storeUploadedImageToPublic(UploadedFile $file, string $relativeDirectory, string $prefix): string
    {
        $directory = public_path(trim($relativeDirectory, '/'));
        if (! File::exists($directory)) {
            File::makeDirectory($directory, 0755, true);
        }

        $extension = strtolower((string) $file->getClientOriginalExtension() ?: 'png');
        $filename = time() . '_' . uniqid($prefix, true) . '.' . $extension;
        $file->move($directory, $filename);

        return '/' . trim($relativeDirectory, '/') . '/' . $filename;
    }

    private function deleteUploadedImageIfLocal(string $path): void
    {
        if (! is_string($path) || trim($path) === '') {
            return;
        }

        // Only delete if it looks like a local public path.
        if (
            str_starts_with($path, 'http://') ||
            str_starts_with($path, 'https://') ||
            str_starts_with($path, 'data:')
        ) {
            return;
        }

        $absolutePath = public_path(ltrim($path, '/'));
        if (File::exists($absolutePath)) {
            @unlink($absolutePath);
        }
    }
}

