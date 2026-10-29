<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('products:sync-inventory')
    ->everyTenMinutes()
    ->withoutOverlapping();

// Picks up images uploaded through pages other than the product form (heroes, about page, ...)
Schedule::command('images:resize')
    ->hourly()
    ->withoutOverlapping();
