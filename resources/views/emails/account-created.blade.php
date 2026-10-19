<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your account has been created</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f0eb; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #334155;">

    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f3f0eb; padding: 40px 0;">
        <tr>
            <td align="center">
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
                                        <span style="font-size: 13px; color: #64748b; font-weight: 500;">Account Created</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 0 40px 40px 40px;">
                            <h2 style="font-size: 28px; font-family: Georgia, serif; font-weight: normal; color: #0f172a; margin-top: 0; margin-bottom: 16px; line-height: 1.2;">Welcome to Viveren!</h2>
                            <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-top: 0; margin-bottom: 24px;">
                                Hi {{ $user->name }}, your account has been created on Viveren. Log in to your profile to manage your orders and track your shipments.
                            </p>

                            <!-- Account details -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 14px; color: #334155; line-height: 1.6; margin-bottom: 28px; border-top: 1px solid #eef0f2; border-bottom: 1px solid #eef0f2;">
                                <tr>
                                    <td width="100" style="color: #64748b; padding: 12px 0;">Login email</td>
                                    <td style="padding: 12px 0; font-weight: 500;">{{ $user->email }}</td>
                                </tr>
                            </table>

                            <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-top: 0; margin-bottom: 24px;">
                                For your security, please set your password before logging in for the first time.
                            </p>

                            <div style="margin-bottom: 16px;">
                                <a href="{{ $setPasswordUrl }}" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; font-size: 14px; font-weight: 500; text-decoration: none; border-radius: 6px; display: inline-block;">Set Your Password</a>
                            </div>

                            <p style="font-size: 13px; line-height: 1.6; color: #94a3b8; margin: 0 0 24px 0;">
                                Already set your password? <a href="{{ $loginUrl }}" style="color: #0f172a; text-decoration: underline;">Log in to your account</a>.
                            </p>

                            <p style="font-size: 13px; line-height: 1.6; color: #94a3b8; margin: 0;">
                                Need help? Please do not reply to this email. Contact us at
                                <a href="mailto:support@viveren.com" style="color: #0f172a; text-decoration: underline;">support@viveren.com</a>.
                            </p>
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