# Hostinger VPS deployment

## Fix 413 errors on product image uploads

HTTP 413 is returned by the web server before Laravel receives the request. The application allows a 260 MB multipart request, but Nginx defaults to only 1 MB unless `client_max_body_size` is configured.

On the VPS, copy the included Nginx configuration and enable it from the site's `server` block:

```bash
sudo cp deploy/nginx-upload-limits.conf /etc/nginx/snippets/viveren-upload-limits.conf
sudoedit /etc/nginx/sites-available/YOUR_SITE_CONFIG
```

Add this line anywhere inside the site's `server { ... }` block:

```nginx
include /etc/nginx/snippets/viveren-upload-limits.conf;
```

Test and reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

The committed `public/.user.ini` configures PHP with `upload_max_filesize=256M`, `post_max_size=260M`, and `max_file_uploads=100`. PHP-FPM can cache `.user.ini` values for up to five minutes. If the values do not update, restart the installed PHP-FPM service, for example:

```bash
sudo systemctl restart php8.3-fpm
```

Confirm the active Nginx value with:

```bash
sudo nginx -T | grep client_max_body_size
```

If Hostinger uses OpenLiteSpeed or Apache without Nginx in front, `public/.htaccess` already applies the equivalent request and PHP limits.