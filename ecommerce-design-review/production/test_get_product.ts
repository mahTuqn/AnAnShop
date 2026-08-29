import { getProduct } from './src/lib/storefront/adapters-api';

async function test() {
  const p = await getProduct('dam-bau-linen-an-nhien');
  console.log(JSON.stringify(p, null, 2));
}

test();
