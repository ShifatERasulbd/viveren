<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('about_giving_back_sections', function (Blueprint $table) {
            $table->string('button_title')->nullable()->default('Learn More')->after('points');
            $table->string('button_link')->nullable()->after('button_title');
            $table->boolean('button_enabled')->default(true)->after('button_link');
        });

        // Update existing default section_title if still 'Giving Back'
        \DB::table('about_giving_back_sections')
            ->where('section_title', 'Giving Back')
            ->update(['section_title' => 'Sustainability']);
    }

    public function down(): void
    {
        Schema::table('about_giving_back_sections', function (Blueprint $table) {
            $table->dropColumn(['button_title', 'button_link', 'button_enabled']);
        });
    }
};
