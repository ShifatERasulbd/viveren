<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('about_fabric_technology_sections', function (Blueprint $table) {
            $table->id();
            $table->string('image')->nullable();
            $table->string('section_title')->default('Fabric & Technology');
            $table->string('title')->default('Fabric, Engineered with Purpose');
            $table->text('description')->nullable();
            $table->string('button_title')->nullable()->default('Discover Our Fabrics');
            $table->string('button_link')->nullable()->default('#');
            $table->boolean('button_enabled')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('about_fabric_technology_sections');
    }
};
