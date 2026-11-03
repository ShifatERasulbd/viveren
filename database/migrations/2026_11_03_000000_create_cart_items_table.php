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
        Schema::create('cart_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            // Same "productId::color::size" key the storefront cart uses to tell lines apart
            $table->string('line_id');
            $table->string('product_id');
            $table->string('name');
            $table->decimal('price_value', 10, 2)->default(0);
            $table->text('image')->nullable();
            $table->unsignedInteger('quantity')->default(1);
            $table->string('selected_color')->nullable();
            $table->string('selected_size')->nullable();
            $table->string('slug')->nullable();
            $table->decimal('weight', 12, 4)->nullable();
            $table->decimal('length', 10, 2)->nullable();
            $table->decimal('width', 10, 2)->nullable();
            $table->decimal('height', 10, 2)->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'line_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cart_items');
    }
};
