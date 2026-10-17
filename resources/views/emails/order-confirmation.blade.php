<!DOCTYPE html>

<html>

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation</title>
</head>

<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; padding: 40px 20px; color: #18181b; margin: 0;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff;">
    <tr>
        <td align="center" style="padding: 0;">

            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; background-color: #ffffff;">
                <tr>
                    <td style="padding: 0;">

                        <!-- Logo -->
                        <div style="margin-bottom: 32px;">
                            <img
                                src="https://viveren.com/uploads/settings/logos/20260804040313-bf8078c26d.png"
                                alt="Viveren"
                                height="28"
                                style="display: block; max-height: 28px; object-fit: contain;"
                            >
                        </div>

                        <!-- Heading -->
                        <h2 style="font-size: 24px; font-weight: 700; color: #111111; margin: 0 0 16px 0; letter-spacing: -0.5px;">
                            Thank you for your order
                        </h2>

                        <p style="font-size: 15px; color: #3f3f46; margin: 0 0 24px 0; line-height: 1.5;">
                            Hi {{ $order->first_name }}, we have received your order and payment. We will email you again when it ships.
                        </p>

                        <!-- Order meta -->
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px; border-top: 1px solid #e4e4e7; border-bottom: 1px solid #e4e4e7;">
                            <tr>
                                <td style="padding: 14px 0; font-size: 13px; color: #71717a;">Order number</td>
                                <td align="right" style="padding: 14px 0; font-size: 14px; font-weight: 600; color: #111111;">{{ $order->order_number }}</td>
                            </tr>
                            <tr>
                                <td style="padding: 0 0 14px 0; font-size: 13px; color: #71717a;">Order date</td>
                                <td align="right" style="padding: 0 0 14px 0; font-size: 14px; color: #111111;">{{ optional($order->created_at)->format('M j, Y') }}</td>
                            </tr>
                        </table>

                        <!-- Items -->
                        <h3 style="font-size: 16px; font-weight: 700; color: #111111; margin: 0 0 12px 0;">Order summary</h3>

                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 8px;">
                            @foreach ($items as $item)
                                <tr>
                                    @if ($item['image'])
                                        <td width="72" valign="top" style="padding: 12px 12px 12px 0; border-bottom: 1px solid #f4f4f5;">
                                            <img src="{{ $item['image'] }}" alt="{{ $item['name'] }}" width="60" style="display: block; width: 60px; height: auto; border: 0;">
                                        </td>
                                    @endif
                                    <td valign="top" style="padding: 12px 0; border-bottom: 1px solid #f4f4f5;">
                                        <div style="font-size: 14px; font-weight: 600; color: #111111; line-height: 1.4;">{{ $item['name'] }}</div>
                                        @if ($item['color'] || $item['size'])
                                            <div style="font-size: 12px; color: #71717a; margin-top: 2px;">
                                                {{ collect([$item['color'], $item['size']])->filter()->implode(' / ') }}
                                            </div>
                                        @endif
                                        <div style="font-size: 12px; color: #71717a; margin-top: 2px;">
                                            Qty {{ $item['quantity'] }} &times; ${{ number_format($item['price'], 2) }}
                                        </div>
                                    </td>
                                    <td align="right" valign="top" style="padding: 12px 0; border-bottom: 1px solid #f4f4f5; font-size: 14px; color: #111111; white-space: nowrap;">
                                        ${{ number_format($item['line_total'], 2) }}
                                    </td>
                                </tr>
                            @endforeach
                        </table>

                        <!-- Totals -->
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
                            <tr>
                                <td style="padding: 6px 0; font-size: 14px; color: #52525b;">Subtotal</td>
                                <td align="right" style="padding: 6px 0; font-size: 14px; color: #111111;">${{ number_format((float) $order->subtotal, 2) }}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; font-size: 14px; color: #52525b;">Shipping</td>
                                <td align="right" style="padding: 6px 0; font-size: 14px; color: #111111;">${{ number_format((float) ($order->delivery_cost ?? $order->shipping), 2) }}</td>
                            </tr>
                            @if ((float) $order->stripe_charge > 0)
                                <tr>
                                    <td style="padding: 6px 0; font-size: 14px; color: #52525b;">Processing fee</td>
                                    <td align="right" style="padding: 6px 0; font-size: 14px; color: #111111;">${{ number_format((float) $order->stripe_charge, 2) }}</td>
                                </tr>
                            @endif
                            @if ((float) $order->state_tax > 0)
                                <tr>
                                    <td style="padding: 6px 0; font-size: 14px; color: #52525b;">Tax</td>
                                    <td align="right" style="padding: 6px 0; font-size: 14px; color: #111111;">${{ number_format((float) $order->state_tax, 2) }}</td>
                                </tr>
                            @endif
                            <tr>
                                <td style="padding: 12px 0 0 0; border-top: 1px solid #e4e4e7; font-size: 16px; font-weight: 700; color: #111111;">Total</td>
                                <td align="right" style="padding: 12px 0 0 0; border-top: 1px solid #e4e4e7; font-size: 16px; font-weight: 700; color: #111111;">${{ number_format((float) $order->total, 2) }}</td>
                            </tr>
                        </table>

                        <!-- Shipping address -->
                        <h3 style="font-size: 16px; font-weight: 700; color: #111111; margin: 0 0 8px 0;">Shipping address</h3>
                        <p style="font-size: 14px; color: #3f3f46; margin: 0 0 28px 0; line-height: 1.6;">
                            {{ $order->first_name }} {{ $order->last_name }}<br>
                            {{ $order->address_line_1 }}<br>
                            @if ($order->address_line_2)
                                {{ $order->address_line_2 }}<br>
                            @endif
                            {{ collect([$order->city, $order->state, $order->postal_code])->filter()->implode(', ') }}<br>
                            {{ $order->country }}
                        </p>

                        <p style="font-size: 14px; font-weight: 600; color: #18181b; margin: 0 0 12px 0; line-height: 1.5;">
                            Questions about your order? Reply to this email or contact us at hello@viveren.com.
                        </p>

                        <p style="font-size: 12px; color: #a1a1aa; margin: 0; line-height: 1.5;">
                            Please keep this email as your receipt.
                        </p>

                    </td>
                </tr>
            </table>

        </td>
    </tr>
</table>

</body>

</html>