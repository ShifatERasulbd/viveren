<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Hero extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'image',
        'video',

        // DB column name (see migration 2026_07_13_055505...)
        'display_title_mode',
        'header_title',
        'header_title_items',
     
        'button_enabled',
        'button_url',
    ];

    protected $casts = [
        'button_enabled' => 'boolean',
        'header_title_items' => 'array',
    ];
}