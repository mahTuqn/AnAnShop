const fs = require('fs');
let content = fs.readFileSync('src/NewApp.tsx', 'utf8');

// 1. Extract Cart Component
const cartRegex = /const Cart = \(\) => \([\s\S]*?<\/main>\n  \);/;
const cartMatch = content.match(cartRegex);
if (cartMatch) {
  const cartCode = `import type { Product } from "../types";\n\nexport default function CartPage({ count, cart, products, formatMoney, update, Icon, subtotal, go, Empty }: any) {\n  return (\n${cartMatch[0].replace('const Cart = () => (', '').slice(0, -2)}\n  );\n}`;
  fs.writeFileSync('src/pages/CartPage.tsx', cartCode);
  content = content.replace(cartMatch[0], 'const Cart = () => <CartPage count={count} cart={cart} products={products} formatMoney={formatMoney} update={update} Icon={Icon} subtotal={subtotal} go={go} Empty={Empty} />;');
  content = 'import CartPage from "./pages/CartPage";\n' + content;
}

// 2. Extract Checkout Component
const checkoutRegex = /const Checkout = \(\) => \{[\s\S]*?<\/main>\n    \);\n  \};/;
const checkoutMatch = content.match(checkoutRegex);
if (checkoutMatch) {
  const checkoutCode = `import type { Product } from "../types";\n\nexport default function CheckoutPage({ logged, notify, go, cart, address, setAddress, currentUser, subtotal, formatMoney, place, Icon, Empty, products }: any) {\n  ${checkoutMatch[0].replace('const Checkout = () => {', '').slice(0, -2)}\n}`;
  fs.writeFileSync('src/pages/CheckoutPage.tsx', checkoutCode);
  content = content.replace(checkoutMatch[0], 'const Checkout = () => <CheckoutPage logged={logged} notify={notify} go={go} cart={cart} address={address} setAddress={setAddress} currentUser={currentUser} subtotal={subtotal} formatMoney={formatMoney} place={place} Icon={Icon} Empty={Empty} products={products} />;');
  content = 'import CheckoutPage from "./pages/CheckoutPage";\n' + content;
}

fs.writeFileSync('src/NewApp.tsx', content);
