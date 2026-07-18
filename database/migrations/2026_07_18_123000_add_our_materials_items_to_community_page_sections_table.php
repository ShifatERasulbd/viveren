<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('community_page_sections', function (Blueprint $table) {
            if (!Schema::hasColumn('community_page_sections', 'our_materials_items')) {
                $table->json('our_materials_items')->nullable()->after('feature_image_2');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('community_page_sections', function (Blueprint $table) {
            if (Schema::hasColumn('community_page_sections', 'our_materials_items')) {
                $table->dropColumn('our_materials_items');
            }
        });
    }
};
