<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sizes', function (Blueprint $table) {
            $table->unsignedInteger('position')->nullable()->after('Size');
        });

        DB::table('sizes')
            ->orderBy('size')
            ->orderBy('id')
            ->pluck('id')
            ->each(function ($id, $index) {
                DB::table('sizes')->where('id', $id)->update(['position' => $index + 1]);
            });
    }

    public function down(): void
    {
        Schema::table('sizes', function (Blueprint $table) {
            $table->dropColumn('position');
        });
    }
};