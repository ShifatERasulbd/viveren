# TODO

- [x] Fix `SustainabilityLongivityController` response serialization bug (`toResponse` currently references `$this->id` etc.)

- [x] Complete full CRUD in `SustainabilityLongivityController` (index/store/show/update/destroy)

- [x] Standardize image upload/delete behavior for the longivity section

- [x] Register public + admin routes for longivity in `routes/api.php`

- [x] Verify routes exist via `php artisan route:list`

- [ ] Smoke test API endpoints (GET/POST/PUT/DELETE) and ensure frontend receives correct JSON

