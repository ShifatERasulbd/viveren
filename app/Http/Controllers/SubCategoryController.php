<?php

namespace App\Http\Controllers;

use App\Models\SubCategory;
use App\Services\JoorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

class SubCategoryController extends Controller
{
    public function __construct(private readonly JoorService $joorService)
    {
    }

    private function toResponseArray(SubCategory $subCategory): array
    {
        $data = $subCategory->toArray();
        $data['image_url'] = $subCategory->image ? Storage::url($subCategory->image) : null;

        return $data;
    }

    /**
     * Best-effort create/update of the JOOR linesheet (Collection) mirroring this sub-category.
     * Never throws — a JOOR outage must not block sub-category CRUD.
     */
    private function syncLinesheet(SubCategory $subCategory): array
    {
        $synced = false;
        $error = null;

        try {
            $response = $this->joorService->syncSubCategoryLinesheet($subCategory);
            $synced = (bool) ($response['ok'] ?? false);

            if (! $synced) {
                $errors = data_get($response, 'body.errors', []);
                $error = is_array($errors) ? json_encode($errors) : 'JOOR linesheet sync failed.';
            }
        } catch (Throwable $exception) {
            Log::warning('Failed to sync sub-category linesheet to JOOR.', [
                'sub_category_id' => $subCategory->id,
                'error' => $exception->getMessage(),
            ]);

            $error = $exception->getMessage();
        }

        return ['joor_synced' => $synced, 'joor_sync_error' => $error];
    }

    /**
     * Best-effort archive of the JOOR linesheet tied to this sub-category (JOOR has no
     * hard-delete for collections). Never throws — must not block sub-category deletion.
     */
    private function archiveLinesheet(SubCategory $subCategory): void
    {
        try {
            $this->joorService->archiveSubCategoryLinesheet($subCategory);
        } catch (Throwable $exception) {
            Log::warning('Failed to archive sub-category linesheet in JOOR.', [
                'sub_category_id' => $subCategory->id,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    public function index(): JsonResponse
    {
        $subcategories = SubCategory::query()
            ->with('category')
            ->orderBy('id')
            ->get()
            ->map(fn (SubCategory $subCategory) => $this->toResponseArray($subCategory));

        return response()->json($subcategories);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'unique:sub_categories,slug'],
            'image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:2048'],
            'category_id' => ['required', 'exists:categories,id'],
        ]);

        if ($request->hasFile('image')) {
            $validated['image'] = $request->file('image')->store('subcategories/images', 'public');
        }

        $subcategory = SubCategory::query()->create($validated)->load('category');
        $joorResult = $this->syncLinesheet($subcategory);

        return response()->json([...$this->toResponseArray($subcategory->fresh()->load('category')), ...$joorResult], 201);
    }

    public function show(SubCategory $sub_category): JsonResponse
    {
        return response()->json($this->toResponseArray($sub_category->load('category')));
    }

    public function update(Request $request, SubCategory $sub_category): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'unique:sub_categories,slug,' . $sub_category->id],
            'image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:2048'],
            'category_id' => ['required', 'exists:categories,id'],
        ]);

        if ($request->hasFile('image')) {
            if ($sub_category->image) {
                Storage::disk('public')->delete($sub_category->image);
            }

            $validated['image'] = $request->file('image')->store('subcategories/images', 'public');
        }

        $sub_category->update($validated);
        $joorResult = $this->syncLinesheet($sub_category);

        return response()->json([...$this->toResponseArray($sub_category->fresh()->load('category')), ...$joorResult]);
    }

    public function destroy(SubCategory $sub_category): JsonResponse
    {
        if ($sub_category->image) {
            Storage::disk('public')->delete($sub_category->image);
        }

        $this->archiveLinesheet($sub_category);
        $sub_category->delete();

        return response()->json(null, 204);
    }
}