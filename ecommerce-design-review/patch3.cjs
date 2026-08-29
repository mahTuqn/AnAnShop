const fs = require('fs');
let content = fs.readFileSync('src/NewApp.tsx', 'utf8');

// 1. Add states
content = content.replace(
  '[adminTab,setAdminTab]=useState("overview");',
  '[adminTab,setAdminTab]=useState("overview"),[minPrice,setMinPrice]=useState(""),[maxPrice,setMaxPrice]=useState(""),[history,setHistory]=useState<number[]>(()=>{try{return JSON.parse(localStorage.getItem("history")||"[]")}catch{return[]}});'
);

// 2. Add useEffect for history
content = content.replace(
  'useEffect(()=>{localStorage.setItem("wish",JSON.stringify(wish))},[wish]);',
  'useEffect(()=>{localStorage.setItem("wish",JSON.stringify(wish))},[wish]);\n useEffect(()=>{localStorage.setItem("history",JSON.stringify(history))},[history]);'
);

// 3. Update shown
content = content.replace(
  'const shown=useMemo(()=>{let a=products.filter(p=>(category==="all"||p.category===category)&&(!query||`${p.name} ${p.material}`.toLowerCase().includes(query.toLowerCase()))&&(!sizeFilter||p.sizes.some(s=>s.name===sizeFilter&&s.stock)));if(sort==="asc")a=[...a].sort((x,y)=>x.price-y.price);if(sort==="desc")a=[...a].sort((x,y)=>y.price-x.price);return a},[category,query,sizeFilter,sort]);',
  'const shown=useMemo(()=>{let a=products.filter(p=>(category==="all"||p.category===category)&&(!query||`${p.name} ${p.material}`.toLowerCase().includes(query.toLowerCase()))&&(!sizeFilter||p.sizes.some(s=>s.name===sizeFilter&&s.stock))&&(!minPrice||p.price>=Number(minPrice))&&(!maxPrice||p.price<=Number(maxPrice)));if(sort==="asc")a=[...a].sort((x,y)=>x.price-y.price);if(sort==="desc")a=[...a].sort((x,y)=>y.price-x.price);return a},[category,query,sizeFilter,sort,minPrice,maxPrice]);'
);

// 4. Update Listing filters
content = content.replace(
  '<label>Kích thước</label>',
  '<label>Giá</label><div className="price-filter"><input type="number" placeholder="Từ" value={minPrice} onChange={e=>setMinPrice(e.target.value)}/> - <input type="number" placeholder="Đến" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)}/></div><hr/><label>Kích thước</label>'
);

// 5. Update Detail to save to history
content = content.replace(
  'const Detail=({p}:{p:Product})=>{const color=selectedColor||p.colors[0].name;return',
  'const Detail=({p}:{p:Product})=>{useEffect(()=>{setHistory(h=>{const nh=h.filter(id=>id!==p.id);return [p.id,...nh].slice(0,5)})},[p.id]);const color=selectedColor||p.colors[0].name;return'
);

// 6. Update Detail to show history
content = content.replace(
  '<section className="best related"><h2>Có thể mẹ cũng thích</h2><div className="products">{products.filter(x=>x.id!==p.id).slice(0,4).map(x=><Card p={x} key={x.id}/>)}</div></section>',
  '<section className="best related"><h2>Có thể mẹ cũng thích</h2><div className="products">{products.filter(x=>x.id!==p.id).slice(0,4).map(x=><Card p={x} key={x.id}/>)}</div></section>{history.length>1&&<section className="best related"><h2>Sản phẩm đã xem</h2><div className="products">{history.filter(id=>id!==p.id).map(id=>products.find(x=>x.id===id)).filter(Boolean).map((x:any)=><Card p={x} key={x.id}/>)}</div></section>}'
);

fs.writeFileSync('src/NewApp.tsx', content);
