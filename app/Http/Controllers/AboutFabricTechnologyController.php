<?php

namespace App\Http\Controllers;

use App\Models\AboutFabricTechnologySection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;

class AboutFabricTechnologyController extends Controller
{
    private function ensureSection(): AboutFabricTechnologySection
    {
        $section = AboutFabricTechnologySection::query()->first();

        if (!$section) {
            $section = AboutFabricTechnologySection::query()->create([
                'image' => '/uploads/heroes/images/hero1.webp',
                'section_title' => 'Fabric & Technology',
                'title' => 'Fabric, Engineered with Purpose',
                'description' => 'Every Viveren fabric is engineered with purpose. From structured knits to breathable, compostable blends, our materials are selected to deliver comfort, durability, and effortless wear — without compromise.',
                'button_title' => 'Discover Our Fabrics',
                'button_link' => '#',
                'button_enabled' => true,
            ]);
        }

        return $section;
    }

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

        return url('/' . ltrim($asset, '/'));
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

    private function toResponse(AboutFabricTechnologySection $section): array
    {
        return [
            'id' => $section->id,
            'image' => $this->resolveAssetUrl($section->image),
            'section_title' => $section->section_title,
            'title' => $section->title,
            'description' => $section->description,
            'button_title' => $section->button_title,
            'button_link' => $section->button_link,
            'button_enabled' => (bool) $section->button_enabled,
        ];
    }

    public function index(): JsonResponse
    {
        return response()->json($this->toResponse($this->ensureSection()));
    }

    public function publicIndex(): JsonResponse
    {
        return $this->index();
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'image' => ['nullable', 'string'],
            'image_file' => ['nullable', 'file', 'mimes:jpeg,png,jpg,gif,webp,avif,svg', 'max:4096'],
            'section_title' => ['required', 'string', 'max:255'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'button_title' => ['nullable', 'string', 'max:255'],
            'button_link' => ['nullable', 'string', 'max:2048'],
            'button_enabled' => ['nullable'],
        ]);

        $section = $this->ensureSection();

        if ($request->hasFile('image_file')) {
            $this->deleteAssetIfLocal($section->image);
            $validated['image'] = $this->storeAssetInPublicDir(
                $request->file('image_file'),
                'uploads/about/fabric-technology',
                'about_fabric_tech_'
            );
        }

        $section->update([
            'image' => $validated['image'] ?? $section->image,
            'section_title' => $validated['section_title'],
            'title' => $validated['title'],
            'description' => $validated['description'] ?? '',
            'button_title' => $validated['button_title'] ?? $section->button_title,
            'button_link' => $validated['button_link'] ?? $section->button_link,
            'button_enabled' => filter_var($request->input('button_enabled', '1'), FILTER_VALIDATE_BOOLEAN),
        ]);

        return response()->json($this->toResponse($section->fresh()));
    }
}
