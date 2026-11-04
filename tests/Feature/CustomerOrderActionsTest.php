<?php

namespace Tests\Feature;

use App\Mail\OrderCancelledMail;
use App\Mail\ReturnRequestedMail;
use App\Models\CheckoutOrder;
use App\Models\User;
use App\Services\ReturnFeeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CustomerOrderActionsTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsCustomer(): User
    {
        $user = User::factory()->create(['user_type' => 'customer']);
        Sanctum::actingAs($user);

        return $user;
    }

    private function orderFor(User $user, string $status): CheckoutOrder
    {
        return CheckoutOrder::create([
            'user_id' => $user->id,
            'order_number' => 'ORD-' . uniqid(),
            'first_name' => 'Sam',
            'last_name' => 'Lee',
            'email' => $user->email,
            'address_line_1' => '1 Main St',
            'city' => 'Austin',
            'total' => 92,
            'items' => [],
            'status' => $status,
        ]);
    }

    public function test_cancelling_an_order_emails_the_customer(): void
    {
        Mail::fake();
        $order = $this->orderFor($this->actingAsCustomer(), 'approved');

        $this->putJson("/api/customer/orders/{$order->id}/cancel")->assertOk();

        $this->assertSame('cancelled', $order->fresh()->status);
        Mail::assertSent(OrderCancelledMail::class, fn ($mail) => $mail->hasTo($order->email));
    }

    // Stands in for Stripe: every return starts an unpaid $7 intent, which then reports as paid or not
    private function fakeReturnFee(bool $paid = true): void
    {
        $this->mock(ReturnFeeService::class, function ($mock) use ($paid) {
            $mock->shouldReceive('start')->andReturn(['id' => 'pi_test', 'client_secret' => 'pi_test_secret_x', 'paid' => false]);
            $mock->shouldReceive('isPaid')->with('pi_test')->andReturn($paid);
        });
    }

    public function test_return_becomes_a_request_only_after_the_fee_is_paid(): void
    {
        Mail::fake();
        $this->fakeReturnFee();
        $order = $this->orderFor($this->actingAsCustomer(), 'delivered');

        $this->postJson("/api/customer/orders/{$order->id}/return", ['reason' => 'change_of_mind', 'comments' => '  Not for me  '])
            ->assertOk()
            ->assertJsonPath('payment.client_secret', 'pi_test_secret_x')
            ->assertJsonPath('payment.amount', 7)
            ->assertJsonPath('order.status', 'delivered');
        Mail::assertNotSent(ReturnRequestedMail::class);

        $this->postJson("/api/customer/orders/{$order->id}/return/confirm", ['payment_intent_id' => 'pi_test'])
            ->assertOk()
            ->assertJsonPath('order.status', 'return_requested');
        Mail::assertSent(ReturnRequestedMail::class, fn ($mail) => $mail->hasTo($order->email));

        // A retried confirm doesn't email the customer twice
        $this->postJson("/api/customer/orders/{$order->id}/return/confirm", ['payment_intent_id' => 'pi_test'])->assertOk();
        Mail::assertSentCount(1);

        $order->refresh();
        $this->assertSame('change_of_mind', $order->return_reason);
        $this->assertSame('Not for me', $order->return_comments);
        $this->assertSame('7.00', (string) $order->return_fee);
        $this->assertNotNull($order->return_fee_paid_at);
    }

    public function test_unpaid_fee_does_not_submit_the_return(): void
    {
        Mail::fake();
        $this->fakeReturnFee(paid: false);
        $order = $this->orderFor($this->actingAsCustomer(), 'delivered');

        $this->postJson("/api/customer/orders/{$order->id}/return", ['reason' => 'change_of_mind'])->assertOk();

        $this->postJson("/api/customer/orders/{$order->id}/return/confirm", ['payment_intent_id' => 'pi_test'])
            ->assertUnprocessable();
        $this->postJson("/api/customer/orders/{$order->id}/return/confirm", ['payment_intent_id' => 'pi_other'])
            ->assertUnprocessable();

        $this->assertSame('delivered', $order->fresh()->status);
        Mail::assertNotSent(ReturnRequestedMail::class);
    }

    public function test_return_requires_a_known_reason(): void
    {
        $order = $this->orderFor($this->actingAsCustomer(), 'delivered');

        $this->postJson("/api/customer/orders/{$order->id}/return", ['reason' => 'other'])
            ->assertUnprocessable();

        $this->assertSame('delivered', $order->fresh()->status);
    }

    public function test_size_issue_must_say_whether_to_replace(): void
    {
        $this->fakeReturnFee();
        $order = $this->orderFor($this->actingAsCustomer(), 'delivered');

        $this->postJson("/api/customer/orders/{$order->id}/return", ['reason' => 'size_issue'])
            ->assertUnprocessable();

        $this->postJson("/api/customer/orders/{$order->id}/return", ['reason' => 'size_issue', 'replace_size' => false])
            ->assertOk();
        $this->assertNull($order->fresh()->return_replacements);
    }

    public function test_damaged_product_requires_a_video(): void
    {
        $this->fakeReturnFee();
        $order = $this->orderFor($this->actingAsCustomer(), 'delivered');

        $this->postJson("/api/customer/orders/{$order->id}/return", ['reason' => 'damaged_product'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('video');

        $this->post("/api/customer/orders/{$order->id}/return", [
            'reason' => 'damaged_product',
            'video' => UploadedFile::fake()->create('unbox.mp4', 500, 'video/mp4'),
        ], ['Accept' => 'application/json'])->assertOk();

        $path = $order->fresh()->return_video_path;
        $this->assertStringEndsWith('.mp4', $path);
        $this->assertFileExists(public_path(ltrim($path, '/')));
        unlink(public_path(ltrim($path, '/')));
    }

    public function test_only_delivered_orders_can_be_returned(): void
    {
        $order = $this->orderFor($this->actingAsCustomer(), 'shipped');

        $this->postJson("/api/customer/orders/{$order->id}/return", ['reason' => 'change_of_mind'])
            ->assertUnprocessable();

        $this->assertSame('shipped', $order->fresh()->status);
    }

    public function test_customer_cannot_return_someone_elses_order(): void
    {
        $other = User::factory()->create(['user_type' => 'customer']);
        $order = $this->orderFor($other, 'delivered');
        $this->actingAsCustomer();

        $this->postJson("/api/customer/orders/{$order->id}/return", ['reason' => 'change_of_mind'])
            ->assertForbidden();
        $this->getJson("/api/customer/orders/{$order->id}/return-options")
            ->assertForbidden();
    }
}
