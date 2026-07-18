<?php

namespace App\Http\Controllers;
use App\Models\SustainabilityThoughtFul;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Http\JsonResponse;


class SustainabilityThoughtFullController extends Controller
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

    private function ensureDefaultThoughtFull(): SustainabilityThoughtFul
    {
        $thoughtFullSection = SustainabilityThoughtFul::query()->first();

        if (!$thoughtFullSection) {
            $thoughtFullSection = SustainabilityThoughtFul::query()->create([
                'content_title' => 'Default Content Title',
                'heading' => 'Default Heading',
                'description' => 'Default Description',
                'image' => null,
            ]);
        }

        return $thoughtFullSection;
    }


    private function toResponse(SustainabilityThoughtFul $thoughtFull): array
    {
        return [
            'id' => $thoughtFull->id,
            'content_title' => $thoughtFull->content_title,
            'heading' => $thoughtFull->heading,
            'description' => $thoughtFull->description,
            'image' => $this->resolveAssetUrl($thoughtFull->image),
        ];
    }


    public function index(): JsonResponse
    {
        return response()->json($this->toResponse($this->ensureDefaultThoughtFull()));
    }

    /**
     * Admin: create a new thought full row (or update the existing default row if you prefer a singleton).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'content_title' => 'required|string|max:255',
            'heading' => 'required|string|max:255',
            'description' => 'required|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg,webp,avif|max:2048',
        ]);

        $thoughtFullSection = SustainabilityThoughtFul::query()->first();
        if (!$thoughtFullSection) {
            $thoughtFullSection = new SustainabilityThoughtFul();
        }

        $imagePath = $thoughtFullSection->image;
        if ($request->hasFile('image')) {
            $this->deleteAssetIfLocal($thoughtFullSection->image);
            $imagePath = $this->storeAssetInPublicDir(
                $request->file('image'),
                'uploads/sustainability/thoughtfull',
                'thoughtfull'
            );
        }

        $thoughtFullSection->fill([
            'content_title' => $validated['content_title'],
            'heading' => $validated['heading'],
            'description' => $validated['description'],
            'image' => $imagePath,
        ]);
        $thoughtFullSection->save();

        return response()->json($this->toResponse($thoughtFullSection->fresh()));
    }

    /**
     * Admin: get thought full by id.
     */
    public function show(SustainabilityThoughtFul $sustainabilityThoughtFul): JsonResponse
    {
        return response()->json($this->toResponse($sustainabilityThoughtFul));
    }

    /**
     * Admin: update thought full by id.
     */
    public function update(Request $request, SustainabilityThoughtFul $sustainabilityThoughtFul): JsonResponse{
        $validated = $request->validate([
            'content_title' => 'required|string|max:255',
            'heading' => 'required|string|max:255',
            'description' => 'required|string',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg,webp,avif|max:2048',
        ]);

        if ($request->hasFile('image')) {
            $this->deleteAssetIfLocal($sustainabilityThoughtFul->image);
            $validated['image'] = $this->storeAssetInPublicDir(
                $request->file('image'),
                'uploads/sustainability/thoughtfull',
                'thoughtfull'
            );
        } else {
            $validated['image'] = $sustainabilityThoughtFul->image;
        }

        $sustainabilityThoughtFul->update([
            'content_title' => $validated['content_title'],
            'heading' => $validated['heading'],
            'description' => $validated['description'],
            'image' => $validated['image'],
        ]);

        return response()->json($this->toResponse($sustainabilityThoughtFul->fresh()));
    }


    /**
     * Admin: delete thought full by id.
     */
    public function destroy(SustainabilityThoughtFul $sustainabilityThoughtFul): JsonResponse
    {
        $this->deleteAssetIfLocal($sustainabilityThoughtFul->image);
        $sustainabilityThoughtFul->delete();

        return response()->json(['message' => 'Deleted successfully']);
    }
}

