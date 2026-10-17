<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Mail\LoginOtpMail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = User::create([
            'name' => trim($validated['first_name'].' '.$validated['last_name']),
            'first_name' => trim($validated['first_name']),
            'last_name' => trim($validated['last_name']),
            'email' => strtolower(trim($validated['email'])),
            'password' => Hash::make($validated['password']),
            'user_type' => 'customer',
        ]);

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json([
            'message' => 'Registration successful.',
            'user' => $user,
        ], 201);
    }

    // Password login (used by the /admin login form)
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $email = strtolower(trim($credentials['email']));

        if (! Auth::attempt(
            ['email' => $email, 'password' => $credentials['password']],
            $request->boolean('remember')
        )) {
            throw ValidationException::withMessages([
                'email' => ['Invalid email or password.'],
            ]);
        }

        $request->session()->regenerate();

        $user = $request->user();

        return response()->json([
            'message' => 'Login successful.',
            'user' => $user,
            'redirect_to' => $user->user_type === 'customer' ? '/user/dashboard' : '/admin/dashboard',
        ]);
    }

   public function sendOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);

        $email = strtolower(trim($validated['email']));
        $localPart = Str::before($email, '@');

        // Find the user, or create one if the email is not in the table
        $user = User::firstOrCreate(
            ['email' => $email],
            [
                'name' => $localPart,
                'first_name' => $localPart,
                'last_name' => '',
                'password' => Str::random(40), // 'hashed' cast in User model hashes it
                'user_type' => 'customer',
            ]
        );

        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $user->otp_code = $otp;
        $user->otp_expires_at = now()->addMinutes(10);
        $user->save();

        try {
            Mail::to($email)->send(new LoginOtpMail($otp, 'no-reply@viveren.com', 'Viveren'));
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'message' => 'Could not send the verification email. Please try again.',
            ], 500);
        }

        return response()->json([
            'message' => 'Verification code sent to your email.',
            'is_new_user' => $user->wasRecentlyCreated,
            'debug_otp' => config('mail.default') === 'log' ? $otp : null,
        ]);
    }

 // Step 2: Verify OTP and Login User
    public function verifyOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'otp' => ['required', 'string', 'size:6'],
        ]);

        $email = strtolower(trim($validated['email']));
        $user = User::where('email', $email)->first();

        if (
            ! $user
            || ! $user->otp_code
            || ! hash_equals((string) $user->otp_code, (string) $validated['otp'])
            || ! $user->otp_expires_at
            || now()->gt($user->otp_expires_at)
        ) {
            return response()->json([
                'message' => 'Invalid or expired verification code.',
            ], 422);
        }

        // Clear code after successful verification
        $user->otp_code = null;
        $user->otp_expires_at = null;

        // The OTP proves the person owns this email
        if (! $user->email_verified_at) {
            $user->email_verified_at = now();
        }

        $user->save();

        Auth::login($user, $request->boolean('remember'));
        $request->session()->regenerate();

        return response()->json([
            'message' => 'Login successful.',
            'user' => $user,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $email = strtolower(trim($validated['email']));

        $status = Password::sendResetLink([
            'email' => $email,
        ]);

        if ($status !== Password::RESET_LINK_SENT) {
            return response()->json([
                'message' => __($status),
            ], 422);
        }

        $mailer = (string) config('mail.default');
        $shouldReturnResetUrl = in_array($mailer, ['log', 'array'], true);

        $payload = [
            'message' => 'Password reset link sent to your email.',
        ];

        if ($shouldReturnResetUrl) {
            $user = User::where('email', $email)->first();
            if ($user) {
                $token = Password::broker()->createToken($user);
                $baseUrl = rtrim((string) config('app.frontend_url', config('app.url', '')), '/');
                $payload['reset_url'] = "{$baseUrl}/reset-password/{$token}?email=".urlencode($email);
            }
        }

        return response()->json($payload);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'password_confirmation' => ['required', 'string', 'same:password'],
        ]);

        $status = Password::reset(
            [
                'email' => strtolower(trim($validated['email'])),
                'password' => $validated['password'],
                'password_confirmation' => $validated['password_confirmation'],
                'token' => $validated['token'],
            ],
            function (User $user, string $password): void {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json([
                'message' => __($status),
            ], 422);
        }

        return response()->json([
            'message' => 'Password reset successful. You can now log in.',
        ]);
    }
}