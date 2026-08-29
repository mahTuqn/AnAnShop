const fs = require('fs');

let content = fs.readFileSync('src/NewApp.tsx', 'utf8');

// 1. Extract Home Component
const homeRegex = /const Home = \(\) => \([\s\S]*?<\/main>\n  \);/;
const homeMatch = content.match(homeRegex);
if (homeMatch) {
  const homeCode = `import type { Product } from "../types";\n\nexport default function HomePage({ go, setCategory, products, categoryLabels, Card, Icon, notify }: any) {\n  return (\n${homeMatch[0].replace('const Home = () => (', '').slice(0, -2)}\n  );\n}`;
  fs.writeFileSync('src/pages/HomePage.tsx', homeCode);
  content = content.replace(homeMatch[0], 'const Home = () => <HomePage go={go} setCategory={setCategory} products={products} categoryLabels={categoryLabels} Card={Card} Icon={Icon} notify={notify} />;');
  content = 'import HomePage from "./pages/HomePage";\n' + content;
}

// 2. Extract Listing Component
const listingRegex = /const Listing = \(\{ search = false \}: \{ search\?: boolean \}\) => \([\s\S]*?<\/main>\n  \);/;
const listingMatch = content.match(listingRegex);
if (listingMatch) {
  const listingCode = `import type { Product } from "../types";\n\nexport default function ListingPage({ search, query, setQuery, category, setCategory, categoryLabels, sizeFilter, setSizeFilter, minPrice, setMinPrice, maxPrice, setMaxPrice, sort, setSort, shown, Empty, Card, Icon }: any) {\n  return (\n${listingMatch[0].replace(/const Listing = [^{]*\{ search = false \}: \{ search\?: boolean \}\) => \(/, '').slice(0, -2)}\n  );\n}`;
  fs.writeFileSync('src/pages/ListingPage.tsx', listingCode);
  content = content.replace(listingMatch[0], 'const Listing = ({ search = false }: { search?: boolean }) => <ListingPage search={search} query={query} setQuery={setQuery} category={category} setCategory={setCategory} categoryLabels={categoryLabels} sizeFilter={sizeFilter} setSizeFilter={setSizeFilter} minPrice={minPrice} setMinPrice={setMinPrice} maxPrice={maxPrice} setMaxPrice={setMaxPrice} sort={sort} setSort={setSort} shown={shown} Empty={Empty} Card={Card} Icon={Icon} />;');
  content = 'import ListingPage from "./pages/ListingPage";\n' + content;
}

fs.writeFileSync('src/NewApp.tsx', content);
