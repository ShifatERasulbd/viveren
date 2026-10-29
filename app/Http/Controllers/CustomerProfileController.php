<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerProfileController extends Controller
{
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
        ]);

        $firstName = trim($validated['first_name']);
        $lastName = trim($validated['last_name']);

        $user = $request->user();
        $user->update([
            'name' => trim($firstName.' '.$lastName),
            'first_name' => $firstName,
            'last_name' => $lastName,
        ]);

        return response()->json([
            'message' => 'Profile updated.',
            'user' => $user,
        ]);
    }
}
