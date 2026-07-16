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
Schema::create('sustainability_hero_sections', function (Blueprint $table) {
            $table->id();

            $table->string('label');
            $table->string('title');
            $table->string('subtitle')->nullable();

            $table->string('image')->nullable();
            $table->string('video')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sustainability_hero_sections');
    }
};
