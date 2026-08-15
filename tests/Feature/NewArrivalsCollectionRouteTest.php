<?php

namespace Tests\Feature;

use Tests\TestCase;

class NewArrivalsCollectionRouteTest extends TestCase
{
    public function test_plural_new_arrivals_collection_route_loads_frontend_shell(): void
    {
        $response = $this->get('/collections/new-arrivals');

        $response->assertOk();
        $response->assertSee('Viveren');
    }
}
