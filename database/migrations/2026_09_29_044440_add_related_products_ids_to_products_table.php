<?php
// database/migrations/2026_09_29_000000_add_related_product_ids_to_products_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'related_product_ids')) {
                $table->json('related_product_ids')->nullable()->after('combo_product_ids');
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'related_product_ids')) {
                $table->dropColumn('related_product_ids');
            }
        });
    }
};