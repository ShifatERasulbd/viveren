$p = App\Models\Product::find(1);
echo json_encode(["show_on_best_sellers" => $p->show_on_best_sellers, "variant_rows" => $p->variant_rows]);
