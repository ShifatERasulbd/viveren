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
        Schema::table('checkout_orders', function (Blueprint $table) {
            if (! Schema::hasColumn('checkout_orders', 'orders_from')) {
                $table->string('orders_from')->nullable()->after('phone');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('checkout_orders', function (Blueprint $table) {
            if (Schema::hasColumn('checkout_orders', 'orders_from')) {
                $table->dropColumn('orders_from');
            }
        });
    }
};
