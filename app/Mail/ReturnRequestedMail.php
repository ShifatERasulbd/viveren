<?php

namespace App\Mail;

use App\Models\CheckoutOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ReturnRequestedMail extends Mailable
{
    use Queueable, SerializesModels;

    private const REASON_LABELS = [
        'change_of_mind' => 'Change of mind',
        'size_issue' => 'Size issue',
        'color_mismatch' => 'Color mismatch',
        'damaged_product' => 'Damaged product',
    ];

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
            subject: 'Return request received #' . $this->order->order_number,
        );
    }

    public function content(): Content
    {
        $replacements = is_array($this->order->return_replacements) ? $this->order->return_replacements : [];

        return new Content(
            view: 'emails.return-requested',
            with: [
                'order' => $this->order,
                'name' => trim((string) $this->order->first_name) ?: 'there',
                'header_logo' => 'https://viveren.com/uploads/settings/logos/20260804040313-bf8078c26d.png',
                'reason' => self::REASON_LABELS[$this->order->return_reason] ?? (string) $this->order->return_reason,
                'replacements' => $replacements,
                'is_exchange' => $replacements !== [],
            ],
        );
    }
}
