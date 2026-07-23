<?php

namespace App\Http\Controllers;

use App\Models\CompliancePage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompliancePageController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(CompliancePage::orderByDesc('created_at')->get());
    }

    public function publicIndex(): JsonResponse
    {
        $page = CompliancePage::orderByDesc('created_at')->first();

        return response()->json($page);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'terms_and_conditions' => 'nullable|string',
            'privacy_policy' => 'nullable|string',
            'shipping_and_return' => 'nullable|string',
        ]);

        $page = CompliancePage::create([
            'title' => trim((string) ($validated['title'] ?? '')),
            'terms_and_conditions' => $validated['terms_and_conditions'] ?? '',
            'privacy_policy' => $validated['privacy_policy'] ?? '',
            'shipping_and_return' => $validated['shipping_and_return'] ?? '',
        ]);

        return response()->json($page, 201);
    }

    public function show(CompliancePage $compliancePage): JsonResponse
    {
        return response()->json($compliancePage);
    }

    public function update(Request $request, CompliancePage $compliancePage): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'terms_and_conditions' => 'nullable|string',
            'privacy_policy' => 'nullable|string',
            'shipping_and_return' => 'nullable|string',
        ]);

        $compliancePage->update([
            'title' => trim((string) ($validated['title'] ?? $compliancePage->title)),
            'terms_and_conditions' => $validated['terms_and_conditions'] ?? $compliancePage->terms_and_conditions,
            'privacy_policy' => $validated['privacy_policy'] ?? $compliancePage->privacy_policy,
            'shipping_and_return' => $validated['shipping_and_return'] ?? $compliancePage->shipping_and_return,
        ]);

        return response()->json($compliancePage->fresh());
    }

    public function destroy(CompliancePage $compliancePage): JsonResponse
    {
        $compliancePage->delete();

        return response()->json(['message' => 'Compliance page deleted successfully']);
    }
}

