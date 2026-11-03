<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CartItem extends Model
{
    protected $fillable = [
        'user_id',
        'line_id',
        'product_id',
        'name',
        'price_value',
        'image',
        'quantity',
        'selected_color',
        'selected_size',
        'slug',
        'weight',
        'length',
        'width',
        'height',
    ];

    protected function casts(): array
    {
        return [
            'price_value' => 'float',
            'quantity' => 'integer',
            'weight' => 'float',
            'length' => 'float',
            'width' => 'float',
            'height' => 'float',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Shape the storefront CartContext stores in localStorage
    public function toCartLine(): array
    {
        return [
            'lineId' => $this->line_id,
            'productId' => $this->product_id,
            'name' => $this->name,
            'priceValue' => $this->price_value,
            'priceLabel' => '$'.number_format($this->price_value, 2, '.', ''),
            'image' => (string) ($this->image ?? ''),
            'quantity' => $this->quantity,
            'selectedColor' => (string) ($this->selected_color ?? ''),
            'selectedSize' => (string) ($this->selected_size ?? ''),
            'slug' => (string) ($this->slug ?? ''),
            'weight' => $this->weight,
            'length' => $this->length,
            'width' => $this->width,
            'height' => $this->height,
        ];
    }
}
