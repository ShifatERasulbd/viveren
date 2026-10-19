<?php

namespace App\Services;

class InvalidShippingAddressException extends \RuntimeException
{
    public function __construct(string $message = 'The shipping address appears to be incorrect. Please check your street address, city, state and ZIP code.')
    {
        parent::__construct($message);
    }
}
