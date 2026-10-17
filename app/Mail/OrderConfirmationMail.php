<?php

namespace App\Mail;

use App\Models\CheckoutOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OrderConfirmationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public CheckoutOrder $order,
        protected string $senderEmail = 'orders-no-reply@viveren.com',
        protected string $senderName = 'Viveren',
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            from: new Address($this->senderEmail, $this->senderName),
            subject: 'Order confirmation #' . $this->order->order_number,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.order-confirmation',
            with: [
                'order' => $this->order,
                'items' => $this->resolveItems(),
            ],
        );
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function resolveItems(): array
    {
        $raw = $this->order->items;

        if (is_string($raw)) {
            $raw = json_decode($raw, true);
        }

        if (! is_array($raw)) {
            return [];
        }

        return collect($raw)
            ->filter(fn ($item) => is_array($item))
            ->map(function (array $item) {
                $price = (float) ($item['priceValue'] ?? 0);
                $quantity = max(1, (int) ($item['quantity'] ?? 1));

                return [
                    'name' => (string) ($item['name'] ?? 'Item'),
                    'color' => trim((string) ($item['selectedColor'] ?? '')),
                    'size' => trim((string) ($item['selectedSize'] ?? '')),
                    'quantity' => $quantity,
                    'price' => $price,
                    'line_total' => round($price * $quantity, 2),
                    'image' => $this->absoluteUrl($item['image'] ?? null),
                ];
            })
            ->values()
            ->all();
    }

    protected function absoluteUrl(?string $path): ?string
    {
        $path = trim((string) $path);

        if ($path === '' || str_starts_with($path, 'data:')) {
            return null;
        }

        if (preg_match('#^https?://#i', $path)) {
            return $path;
        }

        return rtrim((string) config('app.url'), '/') . '/' . ltrim($path, '/');
    }
}