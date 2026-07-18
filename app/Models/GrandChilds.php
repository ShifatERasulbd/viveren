<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
class GrandChilds extends Model
{
    //

    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'sub_category_id',
        'category_id',
        'position',
    ];


    protected $appends = [
        'sub_category_id',
    ];

    // Keep compatibility with older code that used `child_id`
    // (this column does not exist in the DB schema anymore).
    public function getChildIdAttribute()
    {
        return $this->attributes['sub_category_id'] ?? null;
    }

    public function setChildIdAttribute($value)
    {
        $this->attributes['sub_category_id'] = $value;
    }


    public function getSubCategoryIdAttribute()
    {
        return $this->attributes['sub_category_id'] ?? null;
    }

    public function setSubCategoryIdAttribute($value)
    {
        $this->attributes['sub_category_id'] = $value;
    }


    public function subCategory(){
        return $this->belongsTo(SubCategory::class, 'sub_category_id');
    }
    public function category(){
        return $this->belongsTo(Category::class);
    }
}
  