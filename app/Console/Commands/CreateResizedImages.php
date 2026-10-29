<?php

namespace App\Console\Commands;

use App\Support\ImageUploadOptimizer;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Throwable;

class CreateResizedImages extends Command
{
    protected $signature = 'images:resize {--force : Recreate copies that already exist}';

    protected $description = 'Create the downsized WebP copies (public/uploads/resized) the storefront loads instead of full-size uploads';

    public function __construct(private readonly ImageUploadOptimizer $imageUploadOptimizer)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $uploadsDirectory = public_path('uploads');
        if (! File::isDirectory($uploadsDirectory)) {
            $this->warn('No public/uploads directory found.');

            return self::SUCCESS;
        }

        $resizedDirectory = public_path('uploads/resized');
        $images = collect(File::allFiles($uploadsDirectory))
            ->filter(fn ($file) => preg_match('/^(jpe?g|png|webp)$/i', $file->getExtension()))
            ->reject(fn ($file) => str_starts_with($file->getPathname(), $resizedDirectory));

        $written = 0;
        $failed = 0;

        $this->withProgressBar($images, function ($file) use ($uploadsDirectory, &$written, &$failed) {
            $publicPath = '/uploads/' . str_replace('\\', '/', substr($file->getPathname(), strlen($uploadsDirectory) + 1));

            try {
                $written += $this->imageUploadOptimizer->createResizedCopies($publicPath, (bool) $this->option('force'));
            } catch (Throwable $exception) {
                $failed++;
                report($exception);
            }
        });

        $this->newLine();
        $this->info("Checked {$images->count()} images, wrote {$written} resized copies, {$failed} failed.");

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }
}
