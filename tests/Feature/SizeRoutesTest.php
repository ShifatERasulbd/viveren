<?php

namespace Tests\Feature;

use App\Http\Controllers\SizeController;
use Illuminate\Http\Request;
use Tests\TestCase;

class SizeRoutesTest extends TestCase
{
    public function test_reorder_path_resolves_to_the_reorder_action(): void
    {
        $route = app('router')->getRoutes()->match(
            Request::create('/api/sizes/reorder', 'PUT')
        );

        $this->assertSame(SizeController::class.'@reorder', $route->getActionName());
    }

    public function test_size_resource_parameter_only_accepts_numeric_ids(): void
    {
        $route = app('router')->getRoutes()->getByName('sizes.update');

        $this->assertSame('[0-9]+', $route->wheres['size'] ?? null);
    }
}