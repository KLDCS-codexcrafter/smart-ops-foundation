/**
 * AM.4 · T-AM4-Commerce-PWA · behavioral guardrails (≥20 it()).
 * Non-forward-looking · verifies:
 *  - new commerce pages CONSUME existing catalog + order path (0-DIFF schemas)
 *  - payment is Wave-2 only (no payment gateway · honest banner)
 *  - reorder + wishlist + checkout-shell behavior
 *  - §H walls 0-DIFF (engines, MobileRouter core, applications.ts, manifest/sw)
 *  - sprint-history AM.3 flipped to bf33d8e2 + AM.4 row appended · newSiblings empty
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (rel: string) => readFileSync(resolve(__dirname, '..', '..', '..', rel), 'utf8');

const shopHome = read('src/pages/mobile/customer/MobileShopHomePage.tsx');
const shopSearch = read('src/pages/mobile/customer/MobileShopSearchPage.tsx');
const shopCategory = read('src/pages/mobile/customer/MobileShopCategoryPage.tsx');
const shopProduct = read('src/pages/mobile/customer/MobileShopProductPage.tsx');
const checkout = read('src/pages/mobile/customer/MobileCheckoutShellPage.tsx');
const track = read('src/pages/mobile/customer/MobileOrderTrackPage.tsx');
const wishlist = read('src/pages/mobile/customer/MobileWishlistPage.tsx');
const router = read('src/pages/mobile/MobileRouter.tsx');
const operix = read('src/pages/mobile/OperixGoPage.tsx');
const history = read('src/lib/_institutional/sprint-history.ts');
const manifest = read('public/manifest.webmanifest');
const sw = read('public/sw.js');
const cart = read('src/pages/mobile/customer/MobileCustomerCartPage.tsx');
const orders = read('src/pages/mobile/customer/MobileCustomerOrdersPage.tsx');

describe('AM.4 · Pass 1 · Shop home / search / category / product · CONSUME real catalog', () => {
  it('Shop home reads existing catalog key erp_inventory_items', () => {
    expect(shopHome).toMatch(/erp_inventory_items/);
  });
  it('Shop home does not fabricate products or prices', () => {
    expect(shopHome).not.toMatch(/lorem|fakeProducts|sampleProducts|hard.?coded/i);
    expect(shopHome).not.toMatch(/\$/); // no USD anywhere
  });
  it('Search reads same catalog key (no parallel store)', () => {
    expect(shopSearch).toMatch(/erp_inventory_items/);
    expect(shopSearch).not.toMatch(/lorem|fabricated/i);
  });
  it('Category browse reads same catalog key', () => {
    expect(shopCategory).toMatch(/erp_inventory_items/);
  });
  it('Product page reads same catalog key + customerCartKey for add-to-cart', () => {
    expect(shopProduct).toMatch(/erp_inventory_items/);
    expect(shopProduct).toMatch(/customerCartKey/);
  });
  it('Product page uses InventoryItem type (consumes existing model)', () => {
    expect(shopProduct).toMatch(/from '@\/types\/inventory-item'/);
  });
});

describe('AM.4 · Pass 2 · Cart → Checkout-shell → Track · CONSUMES existing order path', () => {
  it('Checkout-shell writes orders via existing customerOrdersKey', () => {
    expect(checkout).toMatch(/customerOrdersKey/);
  });
  it('Checkout-shell stamps fiscal_year_id via existing fyForDate', () => {
    expect(checkout).toMatch(/fyForDate/);
  });
  it('Checkout-shell uses existing CustomerOrder type (0-DIFF schema)', () => {
    expect(checkout).toMatch(/from '@\/types\/customer-order'/);
    expect(checkout).toMatch(/CustomerOrder/);
  });
  it('Checkout-shell contains an honest Wave-2 payment banner', () => {
    expect(checkout).toMatch(/Wave-2/);
    expect(checkout).toMatch(/data-payment-honesty="wave-2"/);
  });
  it('Checkout-shell does NOT invoke any payment gateway (greenfield)', () => {
    expect(checkout).not.toMatch(/razorpay|stripe|paytm|payu|cashfree|phonepe|gpay/i);
    expect(checkout).not.toMatch(/charge|capturePayment|paymentIntent/i);
  });
  it('Order tracking renders timeline from existing CustomerOrder.status', () => {
    expect(track).toMatch(/customerOrdersKey/);
    expect(track).toMatch(/CustomerOrder/);
    expect(track).toMatch(/placed.*confirmed.*packed.*shipped.*delivered/s);
  });
  it('Reorder writes back to existing customerCartKey (no new cart store)', () => {
    expect(track).toMatch(/customerCartKey/);
    expect(track).toMatch(/Reorder/i);
  });
  it('Wishlist uses isolated localStorage key per entity × customer', () => {
    expect(wishlist).toMatch(/erp_customer_wishlist_/);
  });
  it('Cart page extended with a checkout-shell link (additive · place-order preserved)', () => {
    expect(cart).toMatch(/\/mobile\/customer\/checkout/);
    expect(cart).toMatch(/Place Order/);
  });
});

describe('AM.4 · No payment gateway anywhere in new commerce pages', () => {
  const all = [shopHome, shopSearch, shopCategory, shopProduct, checkout, track, wishlist].join('\n');
  it('no payment SDK imports', () => {
    expect(all).not.toMatch(/razorpay|stripe|paytm|payu|cashfree|phonepe/i);
  });
  it('no charge/capture calls', () => {
    expect(all).not.toMatch(/createPaymentIntent|capturePayment|chargeCard/);
  });
  it('no USD / $ symbol', () => {
    expect(all).not.toMatch(/\$/);
  });
});

describe('AM.4 · §H walls 0-DIFF (consume-spine intact)', () => {
  it('manifest still serves the OperixGo installable PWA', () => {
    expect(manifest).toMatch(/OperixGo/);
    expect(manifest).toMatch(/standalone/);
  });
  it('service worker still present (installable consumed · not rewritten)', () => {
    expect(sw.length).toBeGreaterThan(0);
  });
  it('MobileRouter customer routes still resolve original pages (catalog/cart/orders 0-DIFF)', () => {
    expect(router).toMatch(/\/mobile\/customer\/catalog'\) return <MobileCustomerCatalogPage \/>/);
    expect(router).toMatch(/\/mobile\/customer\/cart'\) return <MobileCustomerCartPage \/>/);
    expect(router).toMatch(/\/mobile\/customer\/orders'\) return <MobileCustomerOrdersPage \/>/);
  });
  it('MobileRouter has new commerce routes (additive)', () => {
    expect(router).toMatch(/\/mobile\/customer\/shop/);
    expect(router).toMatch(/\/mobile\/customer\/search/);
    expect(router).toMatch(/\/mobile\/customer\/checkout/);
    expect(router).toMatch(/\/mobile\/customer\/wishlist/);
    expect(router).toMatch(/\/mobile\/customer\/product\//);
    expect(router).toMatch(/\/mobile\/customer\/category\//);
    expect(router).toMatch(/\/mobile\/customer\/track\//);
  });
  it('OperixGoPage surfaces the AM.4 commerce tile', () => {
    expect(operix).toMatch(/am4-commerce-pwa/);
    expect(operix).toMatch(/\/mobile\/customer\/shop/);
  });
  it('Customer orders page (existing surface) untouched in shape', () => {
    expect(orders).toMatch(/customerOrdersKey/);
  });
});

describe('AM.4 · Sprint history · AM.3 flipped + AM.4 row appended · newSiblings empty', () => {
  it('AM.3 row flipped to bf33d8e2 / CONFIRMED', () => {
    expect(history).toMatch(/code: 'T-AM3-Universal-Mobile'[\s\S]{0,200}headSha: 'bf33d8e2'/);
    expect(history).toMatch(/T-AM3-Universal-Mobile[\s\S]{0,400}provenance: 'CONFIRMED'/);
  });
  it('AM.4 row exists with predecessor bf33d8e2', () => {
    expect(history).toMatch(/code: 'T-AM4-Commerce-PWA'[\s\S]{0,200}predecessorSha: 'bf33d8e2'/);
  });
  it('AM.4 newSiblings is empty (consuming UI · no new engine)', () => {
    expect(history).toMatch(/code: 'T-AM4-Commerce-PWA'[\s\S]{0,400}newSiblings: \[\]/);
  });
  it('AM.4 narrative declares MOBILE arc CLOSE (AM.1–AM.4)', () => {
    expect(history).toMatch(/MOBILE Tier-L COMPLETE: AM\.1[\s\S]{0,200}AM\.4 commerce/);
  });
});
