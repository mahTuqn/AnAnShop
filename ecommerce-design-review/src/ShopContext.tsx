import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { CartItem, Product } from "./types";
import { api } from "./api";

interface ShopContextType {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  wish: number[];
  setWish: React.Dispatch<React.SetStateAction<number[]>>;
  history: number[];
  setHistory: React.Dispatch<React.SetStateAction<number[]>>;
  currentUser: any;
  logged: boolean;
  notify: (text: string) => void;
  go: (to: string) => void;
  add: (p: Product, buy?: boolean) => void;
  toggleWish: (id: number) => void;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) throw new Error("useShop must be used within a ShopProvider");
  return context;
};

export const ShopProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem("cart") || "[]"); } catch { return []; }
  });
  const [wish, setWish] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem("wish") || "[3]"); } catch { return [3]; }
  });
  const [history, setHistory] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem("history") || "[]"); } catch { return []; }
  });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [logged, setLogged] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => { localStorage.setItem("cart", JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem("wish", JSON.stringify(wish)); }, [wish]);
  useEffect(() => { localStorage.setItem("history", JSON.stringify(history)); }, [history]);

  useEffect(() => {
    api.auth.me().then(res => {
      if (res.success) {
        setLogged(true);
        setCurrentUser(res.data);
      }
    });
  }, []);

  const go = (to: string) => { location.hash = to; };
  const notify = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(""), 2500);
  };

  const toggleWish = (id: number) => {
    setWish(w => w.includes(id) ? w.filter(x => x !== id) : [...w, id]);
    notify("Đã cập nhật danh sách yêu thích");
  };

  const add = (p: Product, buy = false) => {
    if (!logged) {
      notify("Vui lòng đăng nhập để mua hàng");
      go("/login");
      return;
    }
    // Simple add logic for refactoring purpose (doesn't handle variant selection)
    setCart(c => {
      const i = c.findIndex(x => x.productId === p.id);
      if (i < 0) return [...c, { productId: p.id, size: p.sizes[0].name, color: p.colors[0].name, quantity: 1 }];
      return c.map((x, n) => n === i ? { ...x, quantity: x.quantity + 1 } : x);
    });
    notify("Đã thêm vào giỏ hàng");
    if (buy) go("/checkout");
  };

  return (
    <ShopContext.Provider value={{ cart, setCart, wish, setWish, history, setHistory, currentUser, logged, notify, go, add, toggleWish }}>
      {children}
      {toast && <div className="toast">{toast}</div>}
    </ShopContext.Provider>
  );
};
