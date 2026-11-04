<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Return Request Received</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:6px;overflow:hidden;">
                    <tr>
                        <td style="padding:24px;text-align:center;background:#ffffff;border-bottom:1px solid #eee;">
                            <img src="{{ $header_logo }}" alt="Viveren" style="max-height:40px;">
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px;">
                            <h2 style="margin:0 0 16px;color:#111;">We've received your return request</h2>
                            <p style="color:#333;font-size:15px;line-height:1.5;">
                                Hi {{ $name }},
                            </p>
                            <p style="color:#333;font-size:15px;line-height:1.5;">
                                Your {{ $is_exchange ? 'size exchange' : 'return' }} request for order <strong>#{{ $order->order_number }}</strong>
                                has been submitted and your return fee has been paid. Our team will review it and email you with the next steps.
                            </p>

                            <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border-top:1px solid #eee;border-bottom:1px solid #eee;">
                                <tr>
                                    <td style="padding:12px 0;color:#555;font-size:14px;">Order Number</td>
                                    <td style="padding:12px 0;color:#111;font-size:14px;text-align:right;">{{ $order->order_number }}</td>
                                </tr>
                                <tr>
                                    <td style="padding:12px 0;color:#555;font-size:14px;">Reason</td>
                                    <td style="padding:12px 0;color:#111;font-size:14px;text-align:right;">{{ $reason }}</td>
                                </tr>
                                <tr>
                                    <td style="padding:12px 0;color:#555;font-size:14px;">Request Type</td>
                                    <td style="padding:12px 0;color:#111;font-size:14px;text-align:right;">{{ $is_exchange ? 'Size exchange' : 'Refund' }}</td>
                                </tr>
                                <tr>
                                    <td style="padding:12px 0;color:#555;font-size:14px;">Return Fee Paid</td>
                                    <td style="padding:12px 0;color:#111;font-size:14px;text-align:right;">${{ number_format((float) $order->return_fee, 2) }}</td>
                                </tr>
                                <tr>
                                    <td style="padding:12px 0;color:#555;font-size:14px;">Requested On</td>
                                    <td style="padding:12px 0;color:#111;font-size:14px;text-align:right;">{{ optional($order->return_requested_at)->format('d M Y') }}</td>
                                </tr>
                            </table>

                            @if ($is_exchange)
                                <p style="color:#111;font-size:14px;font-weight:bold;margin:0 0 8px;">Replacement sizes</p>
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                                    @foreach ($replacements as $replacement)
                                        <tr>
                                            <td style="padding:6px 0;color:#333;font-size:14px;">
                                                {{ $replacement['name'] ?? 'Item' }}@if (!empty($replacement['color'])) ({{ $replacement['color'] }})@endif
                                            </td>
                                            <td style="padding:6px 0;color:#111;font-size:14px;text-align:right;white-space:nowrap;">
                                                {{ $replacement['from_size'] ?? '' }} &rarr; <strong>{{ $replacement['to_size'] ?? '' }}</strong>
                                            </td>
                                        </tr>
                                    @endforeach
                                </table>
                            @endif

                            @if ($order->return_reason === 'damaged_product')
                                <p style="color:#333;font-size:15px;line-height:1.5;">
                                    We've received your unboxing video and will use it to review your damage claim.
                                </p>
                            @endif

                            @if (!empty($order->return_comments))
                                <p style="color:#111;font-size:14px;font-weight:bold;margin:0 0 8px;">Your comments</p>
                                <p style="color:#333;font-size:14px;line-height:1.5;margin:0 0 24px;white-space:pre-line;">{{ $order->return_comments }}</p>
                            @endif

                            <p style="color:#333;font-size:15px;line-height:1.5;">
                                @if ($is_exchange)
                                    Once your return is approved, we'll send out your replacement size.
                                @else
                                    Once your return is approved, your refund will be issued to your original payment method.
                                @endif
                            </p>

                            <p style="color:#333;font-size:15px;line-height:1.5;">
                                If you didn't request this return, or have any questions, please contact us on
                                <a href="mailto:support@viveren.com" style="color:#111;text-decoration:underline;">support@viveren.com</a>
                            </p>

                            <p style="color:#333;font-size:15px;line-height:1.5;margin-top:24px;">
                                — The Viveren Team
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
