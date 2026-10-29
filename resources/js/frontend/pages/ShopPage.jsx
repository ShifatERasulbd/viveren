// Imported directly (not lazily): this page is already lazy-loaded by the router,
// so a second lazy step would only add another round trip before products show.
import ShopCatalogSection from '../components/ShopCatalogSection.jsx';

export default function ShopPage() {
    return (
        <div className="bg-background">
            <ShopCatalogSection />
        </div>
    );
}
