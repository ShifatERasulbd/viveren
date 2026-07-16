<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class SustainabilityHeroSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $exists = \App\Models\SustainabilityHeroSection::query()->exists();
        if ($exists) {
            return;
        }

        \App\Models\SustainabilityHeroSection::query()->create([
            'label' => 'Our Responsibility',
            'title' => 'Sustainability & Responsibility',
            'subtitle' => 'How We Think, Design, and Build with Care',
            'image' => null,
            'video' => null,
        ]);
    }
}

