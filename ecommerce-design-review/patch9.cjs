const fs = require('fs');
let content = fs.readFileSync('src/NewApp.tsx', 'utf8');

// 1. Remove useEffect from Detail
const detailEffect = `    useEffect(() => {
      setHistory((h) => {
        const nh = h.filter((id) => id !== p.id);
        return [p.id, ...nh].slice(0, 5);
      });
    }, [p.id]);`;
content = content.replace(detailEffect, '');

// 2. Add useEffect to top level
const target = `const slug = route.split("/product/")[1],
    product = products.find((p) => p.slug === slug),`;
const added = `${target}
  useEffect(() => {
    if (product) {
      setHistory((h) => {
        const nh = h.filter((id) => id !== product.id);
        return [product.id, ...nh].slice(0, 5);
      });
    }
  }, [product?.id]);`;
content = content.replace(target, added);

fs.writeFileSync('src/NewApp.tsx', content);
