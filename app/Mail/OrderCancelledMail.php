<?php

namespace App\Mail;

use App\Models\CheckoutOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OrderCancelledMail extends Mailable
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
            subject: 'Order cancelled #' . $this->order->order_number,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.order-cancelled',
            with: [
                'order' => $this->order,
                'name' => trim((string) $this->order->first_name) ?: 'there',
                'header_logo' => 'https://viveren.com/uploads/settings/logos/20260804040313-bf8078c26d.png',
            ],
        );
    }
}
