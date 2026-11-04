<?php

namespace App\Services;

use App\Models\CheckoutOrder;
use Stripe\PaymentIntent;
use Stripe\StripeClient;

// Charges the flat fee customers pay to submit a return.
class ReturnFeeService
{
    public const AMOUNT_CENTS = 700;

    public const CURRENCY = 'usd';

    private const CANCELLABLE_STATUSES = ['requires_payment_method', 'requires_confirmation', 'requires_action'];

    /**
     * Starts (or recovers) the fee payment for a return. If the customer already paid an
     * earlier attempt whose confirmation never reached us, that payment is reused so they
     * are never charged twice.
     *
     * @return array{id: string, client_secret: ?string, paid: bool}
     */
    public function start(CheckoutOrder $order): array
    {
        $stripe = $this->client();
        $previousId = (string) $order->return_fee_payment_intent_id;

        if ($previousId !== '') {
            $previous = $stripe->paymentIntents->retrieve($previousId, []);

            if ($this->isSuccessfulFee($previous)) {
                return ['id' => $previous->id, 'client_secret' => null, 'paid' => true];
            }

            if (in_array($previous->status, self::CANCELLABLE_STATUSES, true)) {
                $stripe->paymentIntents->cancel($previous->id, []);
            }
        }

        $intent = $stripe->paymentIntents->create([
            'amount' => self::AMOUNT_CENTS,
            'currency' => self::CURRENCY,
            'automatic_payment_methods' => ['enabled' => true],
            'description' => 'Return fee for order '.$order->order_number,
            'receipt_email' => $order->email ?: null,
            'metadata' => [
                'purpose' => 'return_fee',
                'order_id' => (string) $order->id,
                'order_number' => (string) $order->order_number,
            ],
        ]);

        return ['id' => $intent->id, 'client_secret' => $intent->client_secret, 'paid' => false];
    }

    public function isPaid(string $paymentIntentId): bool
    {
        return $this->isSuccessfulFee($this->client()->paymentIntents->retrieve($paymentIntentId, []));
    }

    private function isSuccessfulFee(PaymentIntent $intent): bool
    {
        return $intent->status === 'succeeded'
            && (int) $intent->amount === self::AMOUNT_CENTS
            && $intent->currency === self::CURRENCY;
    }

    private function client(): StripeClient
    {
        $secretKey = (string) config('services.stripe.secret');
        if ($secretKey === '') {
            throw new \RuntimeException('Stripe secret key is not configured.');
        }

        return new StripeClient($secretKey);
    }
}
