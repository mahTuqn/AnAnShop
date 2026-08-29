import { AuthService } from "@/modules/auth";
import { CartService } from "@/modules/cart";
import { CatalogService } from "@/modules/catalog";
import { CheckoutService } from "@/modules/checkout";
import { CodPaymentGateway } from "@/modules/payment";
import { PromotionService } from "@/modules/promotion";
import { Pbkdf2PasswordHasher } from "./passwords";
import { PersistentStore } from "./persistent-store";

const store = new PersistentStore();
const promotions = new PromotionService(store);

export const persistentRuntime = {
  store,
  auth: new AuthService(store, new Pbkdf2PasswordHasher(), store, undefined, { requireEmailVerification: process.env.AUTH_REQUIRE_EMAIL_VERIFICATION === "true" }),
  catalog: new CatalogService(store),
  cart: new CartService(store, store),
  checkout: new CheckoutService(store, store, store, promotions, store, new CodPaymentGateway()),
  promotions,
};

