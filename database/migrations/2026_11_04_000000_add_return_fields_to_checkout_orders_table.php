<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const COLUMNS = [
        'return_reason',
        'return_comments',
        'return_replacements',
        'return_video_path',
        'return_requested_at',
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('checkout_orders', function (Blueprint $table) {
            if (! Schema::hasColumn('checkout_orders', 'return_reason')) {
                $table->string('return_reason')->nullable()->after('status');
            }
            if (! Schema::hasColumn('checkout_orders', 'return_comments')) {
                $table->text('return_comments')->nullable()->after('return_reason');
            }
            if (! Schema::hasColumn('checkout_orders', 'return_replacements')) {
                $table->json('return_replacements')->nullable()->after('return_comments');
            }
            if (! Schema::hasColumn('checkout_orders', 'return_video_path')) {
                $table->string('return_video_path')->nullable()->after('return_replacements');
            }
            if (! Schema::hasColumn('checkout_orders', 'return_requested_at')) {
                $table->timestamp('return_requested_at')->nullable()->after('return_video_path');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('checkout_orders', function (Blueprint $table) {
            foreach (self::COLUMNS as $column) {
                if (Schema::hasColumn('checkout_orders', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
