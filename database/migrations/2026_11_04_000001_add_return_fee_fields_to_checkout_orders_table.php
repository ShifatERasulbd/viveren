<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const COLUMNS = [
        'return_fee',
        'return_fee_payment_intent_id',
        'return_fee_paid_at',
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('checkout_orders', function (Blueprint $table) {
            if (! Schema::hasColumn('checkout_orders', 'return_fee')) {
                $table->decimal('return_fee', 8, 2)->nullable()->after('return_video_path');
            }
            if (! Schema::hasColumn('checkout_orders', 'return_fee_payment_intent_id')) {
                $table->string('return_fee_payment_intent_id')->nullable()->after('return_fee');
            }
            if (! Schema::hasColumn('checkout_orders', 'return_fee_paid_at')) {
                $table->timestamp('return_fee_paid_at')->nullable()->after('return_fee_payment_intent_id');
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
