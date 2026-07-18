<?php

namespace App\Http\Controllers;

use App\Models\SustainabilityHeroSection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;

class SustainabilityHeroController extends Controller
{
    private function resolveAssetUrl(?string $asset): ?string
    {
        if (!$asset) {
            return null;
        }

        if (
            str_starts_with($asset, 'http://') ||
            str_starts_with($asset, 'https://') ||
            str_starts_with($asset, '/') ||
            str_starts_with($asset, 'data:')
        ) {
            return $asset;
        }

        if (File::exists(public_path($asset))) {
            return '/' . ltrim($asset, '/');
        }

        return '/' . ltrim($asset, '/');
    }

    private function deleteAssetIfLocal(?string $assetPath): void
    {
        if (!$assetPath) {
            return;
        }

        if (
            str_starts_with($assetPath, 'http://') ||
            str_starts_with($assetPath, 'https://') ||
            str_starts_with($assetPath, 'data:')
        ) {
            return;
        }

        $publicFile = public_path(ltrim($assetPath, '/'));
        if (File::exists($publicFile)) {
            @unlink($publicFile);
        }
    }

    private function storeAssetInPublicDir($uploadedFile, string $folder, string $prefix): string
    {
        $directory = public_path($folder);
        File::ensureDirectoryExists($directory);

        $extension = strtolower($uploadedFile->getClientOriginalExtension() ?: 'png');
        $filename = time() . '_' . uniqid($prefix, true) . '.' . $extension;
        $uploadedFile->move($directory, $filename);

        return trim($folder, '/') . '/' . $filename;
    }

    private function ensureDefaultHero(): SustainabilityHeroSection
    {
        $hero = SustainabilityHeroSection::first();

        if (!$hero) {
            $hero = SustainabilityHeroSection::query()->create([
                'label' => 'Our Responsibility',
                'title' => 'Sustainability & Responsibility',
                'subtitle' => 'How We Think, Design, and Build with Care',
                'image' => '/uploads/sustainability/hero/default.webp',
                'video' => null,
            ]);
        }

        return $hero;
    }

    private function toResponse(SustainabilityHeroSection $hero): array
    {
        return [
            'id' => $hero->id,
            'label' => $hero->label,
            'title' => $hero->title,
            'subtitle' => $hero->subtitle,
            'image_url' => $this->resolveAssetUrl($hero->image),
            'video_url' => $this->resolveAssetUrl($hero->video),
        ];
    }

    public function publicIndex(): JsonResponse
    {
        $hero = $this->ensureDefaultHero();
        return response()->json($this->toResponse($hero));
    }

    public function index(): JsonResponse
    {
        return $this->publicIndex();
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'label' => ['required', 'string', 'max:255'],
            'title' => ['required', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string', 'max:255'],
            'image_url' => ['nullable', 'string', 'max:2048'],
            'image_file' => ['nullable', 'file', 'mimes:jpeg,jpg,png,webp,avif', 'max:4096'],
            'video_url' => ['nullable', 'string', 'max:2048'],
            'video_file' => ['nullable', 'file', 'mimetypes:video/mp4,video/webm,video/ogg,video/quicktime', 'max:51200'],
        ]);

        $hero = $this->ensureDefaultHero();

        if ($request->hasFile('image_file')) {
            $this->deleteAssetIfLocal($hero->image);
            $validated['image'] = $this->storeAssetInPublicDir($request->file('image_file'), 'uploads/sustainability/hero', 'sustainability_hero_image_');
        } elseif (array_key_exists('image_url', $validated)) {
            $validated['image'] = trim((string) $validated['image_url']) ?: null;
        }

        if ($request->hasFile('video_file')) {
            $this->deleteAssetIfLocal($hero->video);
            $validated['video'] = $this->storeAssetInPublicDir($request->file('video_file'), 'uploads/sustainability/hero', 'sustainability_hero_video_');
        } elseif (array_key_exists('video_url', $validated)) {
            $validated['video'] = trim((string) $validated['video_url']) ?: null;
        }

        $hero->update([
            'label' => $validated['label'],
            'title' => $validated['title'],
            'subtitle' => $validated['subtitle'] ?? '',
            'image' => $validated['image'] ?? $hero->image,
            'video' => $validated['video'] ?? $hero->video,
        ]);

        return response()->json($this->toResponse($hero->fresh()));
    }
}

