<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f0eb; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #334155;">

    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f3f0eb; padding: 40px 0;">
        <tr>
            <td align="center">
                <!-- Main Container -->
                <table border="0" cellpadding="0" cellspacing="0" width="600" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">

                    <!-- Header -->
                    <tr>
                        <td align="left" style="padding: 40px 40px 20px 40px;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td>
                                        <img src="https://viveren.com/uploads/settings/logos/20260804040313-bf8078c26d.png" alt="Viveren" height="28" style="display: block; max-height: 28px; object-fit: contain;">
                                    </td>
                                    <td align="right">
                                        <span style="font-size: 13px; color: #64748b; font-weight: 500;">Order Confirmation</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 0 40px 40px 40px;">
                            <h2 style="font-size: 28px; font-family: Georgia, serif; font-weight: normal; color: #0f172a; margin-top: 0; margin-bottom: 16px; line-height: 1.2;">Thank you for your order!</h2>
                            <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-top: 0; margin-bottom: 32px;">
                                Hi {{ $order->first_name }},Thank you for your purchase! We’ve received your order and confirmed your payment. Your order is moving forward for fulfillment and we’ll notify you the shipping confirmation and tracking details once your order is ready for dispatch.
                            </p>

                            <!-- Shipping Address -->
                            <div style="margin-bottom: 32px;">
                                <h4 style="font-size: 11px; text-transform: uppercase; color: #94a3b8; margin: 0 0 12px 0; letter-spacing: 1px; font-weight: 600;">Shipping Address</h4>
                                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 14px; color: #334155; line-height: 1.6;">
                                    <tr>
                                        <td width="100" valign="top" style="color: #64748b; padding-bottom: 4px;">Name</td>
                                        <td style="padding-bottom: 4px; font-weight: 500;">{{ $order->first_name }} {{ $order->last_name }}</td>
                                    </tr>
                                    <tr>
                                        <td valign="top" style="color: #64748b; padding-bottom: 4px;">Address</td>
                                        <td style="padding-bottom: 4px;">{{ $order->address_line_1 }}@if ($order->address_line_2), {{ $order->address_line_2 }}@endif</td>
                                    </tr>
                                    <tr>
                                        <td valign="top" style="color: #64748b; padding-bottom: 4px;">City</td>
                                        <td style="padding-bottom: 4px;">{{ collect([$order->city, $order->state, $order->postal_code])->filter()->implode(', ') }}, {{ $order->country }}</td>
                                    </tr>
                                    @if (!empty($order->email))
                                        <tr>
                                            <td valign="top" style="color: #64748b; padding-bottom: 4px;">Email</td>
                                            <td style="padding-bottom: 4px;">{{ $order->email }}</td>
                                        </tr>
                                    @endif
                                </table>
                            </div>

                            <!-- Track Your Order Button -->
                            @if (!empty($order->tracking_url))
                                <div style="margin-bottom: 32px;">
                                    <a href="{{ $order->tracking_url }}" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; font-size: 14px; font-weight: 500; text-decoration: none; border-radius: 6px; display: inline-block;">Track Your Order</a>
                                </div>
                            @endif

                            <p style="font-size: 13px; line-height: 1.6; color: #94a3b8; margin: 0;">
                                Questions about your order?Please Do not  reply to this email, Contact us at
                                <a href="mailto:support@viveren.com" style="color: #0f172a; text-decoration: underline;">support@viveren.com</a>.
                            </p>
                        </td>
                    </tr>

                    <!-- Order Summary Section (Cream Background) -->
                    <tr>
                        <td style="background-color: #f9f8f6; padding: 40px; border-top: 1px solid #eef0f2;">
                            <h3 style="font-size: 20px; font-family: Georgia, serif; font-weight: normal; color: #0f172a; margin-top: 0; margin-bottom: 24px;">Order Summary</h3>

                            <!-- Order Meta -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px;">
                                <tr>
                                    <td>
                                        <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Date</span><br>
                                        <span style="font-size: 14px; color: #0f172a; font-weight: 500;">{{ optional($order->created_at)->format('d M Y') }}</span>
                                    </td>
                                    <td @if (empty($order->shipping_carrier)) align="right" @endif>
                                        <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Order</span><br>
                                        <span style="font-size: 14px; color: #0f172a; font-weight: 500;">#{{ $order->order_number }}</span>
                                    </td>
                                    @if (!empty($order->shipping_carrier))
                                        <td align="right">
                                            <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Via</span><br>
                                            <span style="font-size: 14px; color: #0f172a; font-weight: 500;">{{ $order->shipping_carrier }}</span>
                                        </td>
                                    @endif
                                </tr>
                            </table>

                            <!-- Items Table -->
                            <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin-bottom: 24px;">
                                <tbody>
                                    @foreach ($items as $item)
                                        <tr>
                                           @if (!empty($item['image']))
                                                <td width="72" valign="middle" style="padding: 12px 12px 12px 0; border-bottom: 1px solid #eef0f2;">
                                                    <img src="{{ $item['image'] }}" alt="{{ $item['name'] }}" width="60" style="display: block; width: 60px; height: auto; border: 0; border-radius: 6px;">
                                                </td>
                                            @endif
                                            <td valign="middle" style="padding: 12px 8px; border-bottom: 1px solid #eef0f2; font-size: 14px; color: #334155;">
                                                <strong style="font-weight: 600; color: #0f172a;">{{ $item['name'] }}</strong>
                                                <br>
                                                <span style="font-size: 12px; color: #64748b;">
                                                    @if (!empty($item['color']) || !empty($item['size']))
                                                        {{ collect([$item['color'] ?? null, $item['size'] ?? null])->filter()->implode(' / ') }} ·
                                                    @endif
                                                    Qty: {{ $item['quantity'] }} &times; ${{ number_format($item['price'], 2) }}
                                                </span>
                                            </td>
                                            <td align="right" valign="middle" style="padding: 12px 0; border-bottom: 1px solid #eef0f2; font-size: 14px; font-weight: 600; color: #0f172a; white-space: nowrap;">
                                                ${{ number_format($item['line_total'], 2) }}
                                            </td>
                                        </tr>
                                    @endforeach
                                </tbody>
                            </table>

                            <!-- Totals Breakdown -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="6" style="margin-bottom: 16px;">
                                <tr>
                                    <td style="font-size: 14px; color: #64748b;">Subtotal</td>
                                    <td align="right" style="font-size: 14px; color: #334155;">${{ number_format((float) $order->subtotal, 2) }}</td>
                                </tr>
                                <tr>
                                    <td style="font-size: 14px; color: #64748b;">Shipping</td>
                                    <td align="right" style="font-size: 14px; color: #334155;">${{ number_format((float) ($order->delivery_cost ?? $order->shipping), 2) }}</td>
                                </tr>
                                @if ((float) $order->stripe_charge > 0)
                                    <tr>
                                        <td style="font-size: 14px; color: #64748b;">Processing fee</td>
                                        <td align="right" style="font-size: 14px; color: #334155;">${{ number_format((float) $order->stripe_charge, 2) }}</td>
                                    </tr>
                                @endif
                                @if ((float) $order->state_tax > 0)
                                    <tr>
                                        <td style="font-size: 14px; color: #64748b;">Tax</td>
                                        <td align="right" style="font-size: 14px; color: #334155;">${{ number_format((float) $order->state_tax, 2) }}</td>
                                    </tr>
                                @endif
                                <tr>
                                    <td style="font-size: 15px; font-weight: 600; color: #0f172a; border-top: 1px solid #e2e8f0; padding-top: 12px;">Order Total</td>
                                    <td align="right" style="font-size: 15px; font-weight: 600; color: #0f172a; border-top: 1px solid #e2e8f0; padding-top: 12px;">${{ number_format((float) $order->total, 2) }}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Notice -->
                    <tr>
                        <td align="center" style="background-color: #f9f8f6; padding: 0 40px 30px 40px; font-size: 13px; color: #64748b;">
                            Please keep this email as your receipt.
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="center" style="background-color: #ffffff; padding: 24px 40px; border-top: 1px solid #eef0f2;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td>
                                        <img src="https://viveren.com/uploads/settings/logos/20260804040313-bf8078c26d.png" alt="Viveren" height="20" style="display: block; max-height: 20px; object-fit: contain;">
                                    </td>
                                    <td align="right">
                                        <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                                            &copy; {{ date('Y') }} Viveren. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>

</body>
</html>