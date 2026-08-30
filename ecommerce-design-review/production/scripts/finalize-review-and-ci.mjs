import { readFileSync, writeFileSync } from "node:fs";

function replace(path, before, after) {
  const source = readFileSync(path, "utf8");
  if (!source.includes(before)) throw new Error(`Expected source not found: ${path}`);
  writeFileSync(path, source.replace(before, after), "utf8");
}

replace("tests/unit/customer-persistence-contract.test.ts", `expect(reviews).toContain("o.user_id=$3::uuid");`, `expect(reviews).toContain("o.user_id=$2::uuid");`);
replace("tests/unit/customer-persistence-contract.test.ts", `expect(reviews).toContain("status='PENDING'");`, `expect(reviews).toContain("verified_purchase,status");\n    expect(reviews).toContain("'PENDING'");`);

const reviewPath = "src/app/api/reviews/[id]/route.ts";
let review = readFileSync(reviewPath, "utf8");
review = review.replace(`FROM reviews WHERE id=$1::uuid AND user_id=$2::uuid FOR UPDATE`, `FROM reviews WHERE id=$1::uuid AND user_id=$2::uuid`);
review = review.replace(`WHERE id=$1::uuid AND user_id=$2::uuid RETURNING *`, `WHERE id=$1::uuid AND user_id=$2::uuid AND status='PENDING' RETURNING *`);
review = review.replace(`      if (body.imageUrls !== undefined)`, `      if (!rows[0]) throw new AppError("CONFLICT", "Đánh giá vừa được kiểm duyệt và không còn có thể sửa", 409);\n      if (body.imageUrls !== undefined)`);
writeFileSync(reviewPath, review, "utf8");

const ciPath = "../.github/workflows/quality.yml";
let ci = readFileSync(ciPath, "utf8");
const marker = `      - run: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f ../database/migrations/0004_audit_permission.sql`;
if (!ci.includes(marker)) throw new Error("CI migration marker not found");
ci = ci.replace(marker, `${marker}\n      - run: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f ../database/migrations/0005_customer_account_and_order_invariants.sql\n      - run: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f ../database/migrations/0006_content_permissions.sql\n      - run: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f ../database/migrations/0007_notification_read_state.sql`);
writeFileSync(ciPath, ci, "utf8");

replace("src/lib/server/persistent-store.ts", `where: { code: { equals: code, mode: "insensitive" } }`, `where: { code: { equals: code, mode: "insensitive" }, scope: "ORDER" }`);
replace("src/lib/server/persistent-store.ts", `id: string; type: string; value: string;`, `id: string; scope: string; type: string; value: string;`);
replace("src/lib/server/persistent-store.ts", `SELECT id,type::text,value::text,minimum_order::text`, `SELECT id,scope::text,type::text,value::text,minimum_order::text`);
replace("src/lib/server/persistent-store.ts", `if (!coupon || !coupon.active`, `if (!coupon || coupon.scope !== "ORDER" || !coupon.active`);
