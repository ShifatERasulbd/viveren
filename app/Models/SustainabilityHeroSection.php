<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SustainabilityHeroSection extends Model
{
    protected $fillable = [
        'label',
        'title',
        'subtitle',
        'image',
        'video',
    ];
}

