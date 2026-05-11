import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChefHat, ArrowRight, Utensils } from "lucide-react";
import { CartProvider, useCart } from "../components/CartContext";
import { cn } from "../utils/cn";
import CartSummary from "../components/CartSummary";
import CartDrawer from "../components/CartDrawer";
import BillPanel from "../components/BillPanel";
import OrderConfirmationModal from "../components/OrderConfirmationModal";
import type { Restaurant, MenuCategory, MenuItem } from "../components/types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

interface MenuResponse {
  restaurant: Restaurant;
  categories: MenuCategory[];
}

export default function PremiumMenuPage() {
  return (
    <CartProvider>
      <PremiumMenuInner />
    </CartProvider>
  );
}

function PremiumMenuInner() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<MenuResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [billOpen, setBillOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      try {
        const res = await fetch(`${API_BASE}/api/restaurants/${slug}/menu`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Failed to load menu", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  if (loading) return <LoadingScreen />;
  if (!data)
    return <div className="p-10 text-center">Restaurant not found</div>;

  const currencySymbol = getCurrencySymbol(data.restaurant.currency);
  const showreelItems = data.categories
    .flatMap((c) => c.items)
    .filter((i) => i.imageUrl)
    .slice(0, 5);

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[#05160e] text-[#fdfdfd] font-sans selection:bg-[#c18b62]/30 overflow-x-hidden"
    >
      {/* Product Showreel Hero */}
      <ProductShowreel
        items={showreelItems}
        restaurantName={data.restaurant.name}
      />

      {/* Main Menu Content */}
      <main className="relative z-10 rounded-t-[40px] bg-[#05160e] px-4 pb-32 pt-10 md:px-8 border-t border-[#c18b62]/20">
        <div className="mx-auto max-w-2xl">
          {data.categories.map((cat, catIdx) => (
            <motion.section
              key={cat._id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: catIdx * 0.1 }}
              className="mb-12"
            >
              <h2 className="mb-8 flex items-center gap-4 text-3xl font-serif">
                <span className="text-[#c18b62] font-normal italic">
                  0{catIdx + 1}.
                </span>
                <span className="tracking-widest uppercase text-sm border-b border-[#c18b62]/30 pb-1">
                  {cat.name}
                </span>
              </h2>

              <div className="grid gap-8">
                {cat.items.map((item: MenuItem) => (
                  <PremiumItemCard
                    key={item._id}
                    item={item}
                    currencySymbol={currencySymbol}
                  />
                ))}
              </div>
            </motion.section>
          ))}
        </div>
      </main>

      {/* Floating Action Bar */}
      <AnimatePresence>
        {!cartOpen && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-0 right-0 z-50 flex justify-center px-6"
          >
            <div className="flex w-full max-w-lg items-center gap-4 rounded-full border border-[#c18b62]/30 bg-[#0b2b1d]/80 px-4 py-3 backdrop-blur-xl shadow-2xl shadow-black/80">
              <button
                onClick={() => setBillOpen(true)}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fdfdfd]/5 hover:bg-[#c18b62]/20 transition-colors"
                title="View Bill"
              >
                <Utensils className="h-5 w-5 text-[#c18b62]" />
              </button>

              <div className="h-8 w-[1px] bg-[#c18b62]/20" />

              <CartSummary
                currencySymbol={currencySymbol}
                onOpenCart={() => setCartOpen(true)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onConfirmOrder={() => {
          setCartOpen(false);
          setConfirmOpen(true);
        }}
        restaurantId={data.restaurant._id}
        currencySymbol={currencySymbol}
        menuItems={data.categories.flatMap((c) => c.items)}
      />

      {billOpen && (
        <BillPanel
          restaurantId={data.restaurant._id}
          open={billOpen}
          onClose={() => setBillOpen(false)}
          currencySymbol={currencySymbol}
        />
      )}

      {confirmOpen && (
        <OrderConfirmationModal
          restaurantId={data.restaurant._id}
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirmed={() => {}}
          currencySymbol={currencySymbol}
        />
      )}
    </div>
  );
}

function ProductShowreel({
  items,
  restaurantName,
}: {
  items: MenuItem[];
  restaurantName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [items.length]);

  if (items.length === 0) return null;

  return (
    <div className="relative h-[80vh] w-full overflow-hidden bg-[#05160e]">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeIndex}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0"
        >
          <img
            src={items[activeIndex].imageUrl}
            className="h-full w-full object-cover opacity-60"
            alt={items[activeIndex].name}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#05160e] via-transparent to-[#05160e]/50" />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="max-w-4xl"
        >
          <span className="mb-4 inline-block tracking-[0.3em] uppercase text-xs font-bold text-[#c18b62]">
            Authentic Italian Since 2012
          </span>
          <h1 className="mb-6 text-6xl font-serif md:text-8xl leading-tight text-[#fdfdfd]">
            {restaurantName}
          </h1>
          <div className="h-1 w-24 bg-[#c18b62] mx-auto mb-8" />

          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h2 className="text-3xl md:text-5xl font-serif text-[#fdfdfd]">
                {items[activeIndex].name}
              </h2>
              <p className="mx-auto max-w-lg text-lg text-[#fdfdfd]/70 italic">
                {items[activeIndex].description}
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Showreel Indicators */}
      <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-3">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={cn(
              "h-1 transition-all duration-500 rounded-full",
              i === activeIndex ? "w-12 bg-[#c18b62]" : "w-4 bg-white/20",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function PremiumItemCard({
  item,
  currencySymbol,
}: {
  item: MenuItem;
  currencySymbol: string;
}) {
  const { addItem, items } = useCart();
  const inCart = items.find((i) => i.menuItemId === item._id);

  return (
    <motion.div
      whileHover={{ y: -8 }}
      className="group relative flex flex-col gap-6 p-4 rounded-[2rem] bg-[#0b2b1d]/40 border border-[#c18b62]/10 hover:border-[#c18b62]/40 transition-all duration-500"
    >
      {item.imageUrl && (
        <div className="relative h-64 w-full overflow-hidden rounded-[1.5rem]">
          <img
            src={item.imageUrl}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            alt={item.name}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b2b1d] via-transparent to-transparent opacity-60" />
        </div>
      )}

      <div className="flex flex-col flex-1 px-2">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h3 className="text-2xl font-serif text-[#fdfdfd] leading-tight">
            {item.name}
          </h3>
          <div className="flex flex-col items-end">
            <span className="text-xl font-bold text-[#c18b62]">
              {currencySymbol}
              {item.price.toFixed(0)}
            </span>
          </div>
        </div>

        <p className="mb-6 text-[#fdfdfd]/60 leading-relaxed italic">
          {item.description}
        </p>

        <div className="mt-auto flex items-center justify-between gap-4">
          <div className="flex gap-2">
            {item.tags?.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 rounded-md bg-[#c18b62]/10 text-[#c18b62] text-[10px] uppercase font-bold tracking-wider"
              >
                {tag}
              </span>
            ))}
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => addItem(item, 1)}
            className={cn(
              "flex h-12 items-center gap-3 rounded-full px-6 transition-all duration-300 font-bold text-xs uppercase tracking-widest",
              inCart
                ? "bg-[#c18b62] text-white"
                : "bg-[#fdfdfd]/5 text-[#c18b62] border border-[#c18b62]/30 hover:bg-[#c18b62] hover:text-white",
            )}
          >
            {inCart ? (
              <>
                <span className="w-4">{inCart.quantity}</span>
                <span>In Cart</span>
              </>
            ) : (
              <>
                <span>Add Item</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#05160e] text-[#fdfdfd]">
      <motion.div
        animate={{
          rotate: 360,
          scale: [1, 1.2, 1],
        }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        className="mb-8"
      >
        <ChefHat className="h-20 w-20 text-[#c18b62]" />
      </motion.div>
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-2xl font-serif tracking-[0.5em] uppercase text-[#c18b62]"
      >
        Panama
      </motion.h2>
    </div>
  );
}

function getCurrencySymbol(currency?: string) {
  switch ((currency ?? "ILS").toUpperCase()) {
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    case "ILS":
      return "₪";
    case "USD":
      return "$";
    default:
      return "₪";
  }
}
