<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('checkout_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            // Order items are stored as JSON, so a review points at the line by its position
            $table->unsignedInteger('item_index');
            // Kept as the string the order line carries; the product may be deleted later
            $table->string('product_id')->nullable()->index();
            $table->string('product_name');
            $table->unsignedTinyInteger('rating');
            $table->text('comment')->nullable();
            $table->timestamps();

            $table->unique(['checkout_order_id', 'item_index']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_reviews');
    }
};
