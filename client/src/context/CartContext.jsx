import { createContext, useContext, useEffect, useState } from 'react';
import { Animals_CATEGORY } from '../constants/listings.js';
import { DEFAULT_PUBLIC_SETTINGS, settingService } from '../services/settingService.js';
import { useToast } from './ToastContext.jsx';

const CartContext = createContext(null);
const CART_STORAGE_KEY = 'Animals_super_store_cart_v1';

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const { toast } = useToast();

  // Shipping rules are managed by the admin (Settings page); defaults apply until loaded.
  const [storeSettings, setStoreSettings] = useState(DEFAULT_PUBLIC_SETTINGS);
  useEffect(() => {
    let active = true;
    settingService
      .getPublic()
      .then((settings) => active && settings && setStoreSettings({ ...DEFAULT_PUBLIC_SETTINGS, ...settings }))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to persist cart:', e);
    }
  }, [items]);

  const addToCart = (listing, quantity = 1) => {
    if (!listing) return false;

    // Strict business rule: Live Animals cannot be purchased via automated cart
    if (listing.category === Animals_CATEGORY) {
      toast(
        'Live Animals cannot be purchased via automated cart. Please contact the seller directly.',
        'warning'
      );
      return false;
    }

    if (listing.status === 'sold') {
      toast('This item has already been marked as sold.', 'error');
      return false;
    }

    if (listing.stockQuantity !== undefined && listing.stockQuantity <= 0) {
      toast('This product is currently out of stock.', 'error');
      return false;
    }

    const listingId = listing._id || listing.id;
    const cleanQty = Math.max(1, parseInt(quantity, 10) || 1);
    const availableStock = listing.stockQuantity !== undefined ? listing.stockQuantity : 10;

    const existing = items.find((item) => item.id === listingId);
    const existingQty = existing ? existing.quantity : 0;
    if (existingQty + cleanQty > availableStock) {
      toast(`Only ${availableStock} units available in stock.`, 'warning');
      return false;
    }

    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex((item) => item.id === listingId);
      if (existingIndex > -1) {
        const updated = [...prevItems];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + cleanQty,
          stockQuantity: availableStock,
        };
        return updated;
      }

      return [
        ...prevItems,
        {
          id: listingId,
          slug: listing.slug,
          title: listing.title,
          price: Number(listing.price) || 0,
          image: listing.images?.[0]?.url || '',
          category: listing.category,
          location: listing.location || '',
          sellerName: listing.sellerName || '',
          quantity: cleanQty,
          stockQuantity: availableStock,
        },
      ];
    });

    toast(`${listing.title} has been added to your shopping cart.`);
    return true;
  };

  const updateQuantity = (id, newQuantity) => {
    const qty = parseInt(newQuantity, 10);
    if (isNaN(qty) || qty <= 0) {
      removeFromCart(id);
      return;
    }

    const item = items.find((entry) => entry.id === id);
    if (!item) return;

    // Clamp against the stock captured when the item was added. Both the check
    // and the toast stay OUTSIDE the state updater — updaters must be pure,
    // because React may invoke them more than once for the same update.
    const maxStock = item.stockQuantity !== undefined ? item.stockQuantity : 999;
    const clamped = Math.min(qty, maxStock);
    if (clamped < qty) {
      toast(`Only ${maxStock} units available in stock.`, 'warning');
    }

    setItems((prevItems) =>
      prevItems.map((entry) => (entry.id === id ? { ...entry, quantity: clamped } : entry))
    );
  };

  const removeFromCart = (id) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setItems([]);
  };

  /**
   * Number of distinct products in the cart — deliberately NOT the sum of
   * quantities, so the navbar badge only grows when a new item is added and
   * stays put while an existing line's quantity is increased. This matches the
   * "N items in your cart" line on the Cart page, which counts `items.length`.
   */
  const itemCount = items.length;
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const freeShippingThreshold = storeSettings.freeShippingThreshold;
  const shippingFee =
    items.length === 0 || subtotal >= freeShippingThreshold ? 0 : storeSettings.shippingFee;
  const total = subtotal + shippingFee;

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        shippingFee,
        freeShippingThreshold,
        acceptingOrders: storeSettings.acceptingOrders,
        total,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
