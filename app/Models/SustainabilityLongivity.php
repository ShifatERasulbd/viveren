<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class SustainabilityLongivity extends Model
{
    //
    use HasFactory;
    protected $fillable =[
        'content_title',
        'heading',
        'description',
        'image',
    ]
}
 