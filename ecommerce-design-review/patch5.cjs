const fs = require('fs');
let content = fs.readFileSync('src/NewApp.tsx', 'utf8');

// 1. Rename imported products
content = content.replace(
  'import { categoryLabels, defaultAddress, formatMoney, products, seedOrders } from "./data";',
  'import { categoryLabels, defaultAddress, formatMoney, products as mockProducts, seedOrders } from "./data";'
);

// 2. Add state and effect to fetch products
const targetState = 'const [adminTab,setAdminTab]=useState("overview")';
const newState = 'const [adminTab,setAdminTab]=useState("overview"),[dbProducts,setDbProducts]=useState<any[]>([]); useEffect(()=>{api.catalog.products().then(res=>setDbProducts(res.data||[]))},[]); const products = dbProducts.length ? dbProducts : mockProducts;';

content = content.replace(targetState, newState);

fs.writeFileSync('src/NewApp.tsx', content);
