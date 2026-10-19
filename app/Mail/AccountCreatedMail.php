<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AccountCreatedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        protected string $token,
        protected string $senderEmail = 'orders-no-reply@viveren.com',
        protected string $senderName = 'Viveren',
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            from: new Address($this->senderEmail, $this->senderName),
            subject: 'Your Viveren account has been created',
        );
    }

    public function content(): Content
    {
        $base = rtrim((string) config('app.url'), '/');

        return new Content(
            view: 'emails.account-created',
            with: [
                'user' => $this->user,
                'loginUrl' => $base . '/login',
                'setPasswordUrl' => $base . '/reset-password/' . $this->token
                    . '?email=' . urlencode($this->user->email),
            ],
        );
    }
}