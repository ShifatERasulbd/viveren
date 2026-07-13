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
        Schema::table('heroes', function (Blueprint $table) {
            //
            $table->dropColumn('title_display_mode');
            $table->dropColumn('title_font_size');
            $table->dropColumn('title_font_family');
            $table->dropColumn('description_font_size');
            $table->dropColumn('description_font_family');
            $table->dropColumn('text_offset_x');
      
            $table->dropColumn('title_offset_x');
            $table->dropColumn('title_offset_y');
            $table->dropColumn('description_offset_x');
            $table->dropColumn('description_offset_y');
            $table->dropColumn('button_offset_x');
            $table->dropColumn('button_offset_y');
            $table->dropColumn('text_offset_y');

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('your_table_name', function (Blueprint $table) {
            //
        });
    }
};
