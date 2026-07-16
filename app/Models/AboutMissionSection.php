<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AboutMissionSection extends Model
{
    use HasFactory;

    protected $fillable = [
        'background_image',
            'image_title',
        'items' => 'array',
    ];
}
