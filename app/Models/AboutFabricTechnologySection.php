<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AboutFabricTechnologySection extends Model
{
    use HasFactory;

    protected $fillable = [
        'image',
        'section_title',
        'title',
        'description',
        'button_title',
        'button_link',
        'button_enabled',
    ];

    protected $casts = [
        'button_enabled' => 'boolean',
    ];
}
