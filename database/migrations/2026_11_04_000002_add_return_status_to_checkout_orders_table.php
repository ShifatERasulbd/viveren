<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Holds the Inventory-side return workflow status (approved_return, product_received, ...)
     * that Inventory pushes back through the return-requests feed.
     */
    public function up(): void
    {
        Schema::table('checkout_orders', function (Blueprint $table) {
            if (! Schema::hasColumn('checkout_orders', 'return_status')) {
                $table->string('return_status', 50)->nullable()->after('return_requested_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('checkout_orders', function (Blueprint $table) {
            if (Schema::hasColumn('checkout_orders', 'return_status')) {
                $table->dropColumn('return_status');
            }
        });
    }
};
