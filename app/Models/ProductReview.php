<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductReview extends Model
{
    protected $fillable = [
        'checkout_order_id',
        'user_id',
        'item_index',
        'product_id',
        'product_name',
        'rating',
        'comment',
    ];

    protected function casts(): array
    {
        return [
            'item_index' => 'integer',
            'rating' => 'integer',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(CheckoutOrder::class, 'checkout_order_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
