<?php

namespace App\Console\Commands;

use App\Models\SubCategory;
use App\Services\JoorService;
use Illuminate\Console\Command;
use Throwable;

class SyncSubCategoryLinesheets extends Command
{
    protected $signature = 'joor:sync-linesheets {--id=* : Only sync these sub-category IDs}';

    protected $description = 'Create/update the JOOR linesheet (Collection) for every sub-category';

    public function __construct(private readonly JoorService $joorService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $ids = array_filter((array) $this->option('id'));
        $subCategories = SubCategory::query()
            ->when($ids !== [], fn ($query) => $query->whereIn('id', $ids))
            ->orderBy('id')
            ->get();

        $failed = 0;

        foreach ($subCategories as $subCategory) {
            try {
                $response = $this->joorService->syncSubCategoryLinesheet($subCategory);
                $ok = (bool) ($response['ok'] ?? false);
                $detail = $ok
                    ? 'collection ' . $subCategory->fresh()->joor_collection_id
                    : json_encode(data_get($response, 'body.errors') ?: data_get($response, 'body'));
            } catch (Throwable $exception) {
                $ok = false;
                $detail = $exception->getMessage();
            }

            if ($ok) {
                $this->info("#{$subCategory->id} {$subCategory->name}: synced ({$detail})");
            } else {
                $failed++;
                $this->error("#{$subCategory->id} {$subCategory->name}: failed — {$detail}");
            }
        }

        $this->line(($subCategories->count() - $failed) . ' synced, ' . $failed . ' failed.');

        return $failed === 0 ? self::SUCCESS : self::FAILURE;
    }
}
