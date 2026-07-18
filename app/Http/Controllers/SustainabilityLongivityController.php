<?php

namespace App\Http\Controllers;
use App\Models\SustainabilityLongivity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Http\JsonResponse;


class SustainabilityLongivityController extends Controller
{
    private function resolveAssetUrl(?string $asset): ?string
    {
        if (!$asset){
            return null;
        }
        if(str_starts_with($asset, 'http://') || str_starts_with($asset, 'https://') || str_starts_with($asset, '/') || str_starts_with($asset, 'data:')){
            return $asset;
        }
        if(File::exists(public_path($asset))){
            return '/' . ltrim($asset, '/');
        }
        return '/' . ltrim($asset, '/');
    }

    private function deleteAssetIfLocal(?string $assetPath):void
    {
        if(!$assetPath){
            return;
        }

        if(str_starts_with($assetPath,'http://')||
            str_starts_with($assetPath,'https://')||
            str_starts_with($assetPath,'data:')){
            return;
            }
        $publicFile = public_path(ltrim($assetPath,'/'));
        if(File::exists($publicFile)){
            @unlink($publicFile);
        }
    }

    private function storeAssetInPublicDir($uploadedFile, string $folder, string $prefix): string
    {
        $directory = public_path($folder);
        File::ensureDirectoryExists($directory);
        $extension = strtolower($uploadedFile->getClientOriginalExtension() ?: 'png');
        $filename = time().'_'.uniqid($prefix,true).'.'.$extension;
        $uploadedFile->move($directory,$filename);
        return trim($folder,'/').'/'.$filename;
    }

    private function ensureDefaultLongivity(): SustainabilityLongivity
    {
        $longivitySection = SustainabilityLongivity::query()->first();

        if (!$longivitySection) {
            $longivitySection = SustainabilityLongivity::query()->create([
                'content_title' => 'Default Content Title',
                'heading' => 'Default Heading',
                'description' => 'Default Description',
                'image' => null,
            ]);
        }

        return $longivitySection;
    }


    private function toResponse(SustainabilityLongivity $longivity): array
    {
        return [
            'id' => $longivity->id,
            'content_title' => $longivity->content_title,
            'heading' => $longivity->heading,
            'description' => $longivity->description,
            'image' => $this->resolveAssetUrl($longivity->image),
        ];
    }


    public function index(): JsonResponse
    {
        return response()->json($this->toResponse($this->ensureDefaultLongivity()));
    }

    /**
     * Admin: create a new longivity row (or update the existing default row if you prefer a singleton).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'content_title' => 'required|string|max:255',
            'heading' => 'required|string|max:255',
            'description' => 'required|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg,webp,avif|max:2048',
        ]);

        $longivitySection = SustainabilityLongivity::query()->first();
        if (!$longivitySection) {
            $longivitySection = new SustainabilityLongivity();
        }

        $imagePath = $longivitySection->image;
        if ($request->hasFile('image')) {
            $this->deleteAssetIfLocal($longivitySection->image);
            $imagePath = $this->storeAssetInPublicDir(
                $request->file('image'),
                'uploads/sustainability/longivity',
                'longivity'
            );
        }

        $longivitySection->fill([
            'content_title' => $validated['content_title'],
            'heading' => $validated['heading'],
            'description' => $validated['description'],
            'image' => $imagePath,
        ]);
        $longivitySection->save();

        return response()->json($this->toResponse($longivitySection->fresh()));
    }

    /**
     * Admin: get longivity by id.
     */
    public function show(SustainabilityLongivity $sustainabilityLongivity): JsonResponse
    {
        return response()->json($this->toResponse($sustainabilityLongivity));
    }

    /**
     * Admin: update longivity by id.
     */
    public function update(Request $request, SustainabilityLongivity $sustainabilityLongivity): JsonResponse
    {
        $validated = $request->validate([
            'content_title' => 'required|string|max:255',
            'heading' => 'required|string|max:255',
            'description' => 'required|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg,webp,avif|max:2048',
        ]);

        if ($request->hasFile('image')) {
            $this->deleteAssetIfLocal($sustainabilityLongivity->image);
            $validated['image'] = $this->storeAssetInPublicDir(
                $request->file('image'),
                'uploads/sustainability/longivity',
                'longivity'
            );
        } else {
            $validated['image'] = $sustainabilityLongivity->image;
        }

        $sustainabilityLongivity->update([
            'content_title' => $validated['content_title'],
            'heading' => $validated['heading'],
            'description' => $validated['description'],
            'image' => $validated['image'],
        ]);

        return response()->json($this->toResponse($sustainabilityLongivity->fresh()));
    }


    /**
     * Admin: delete longivity by id.
     */
    public function destroy(SustainabilityLongivity $sustainabilityLongivity): JsonResponse
    {
        $this->deleteAssetIfLocal($sustainabilityLongivity->image);
        $sustainabilityLongivity->delete();

        return response()->json(['message' => 'Deleted successfully']);
    }
}

