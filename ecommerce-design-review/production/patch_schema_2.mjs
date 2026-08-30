import pg from 'pg';
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query(`
    -- Add user_id to return_requests
    ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS user_id UUID;

    -- Add moderated_at to reviews
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;

    -- Create content_type enum
    DO $$ BEGIN
      CREATE TYPE content_type AS ENUM ('PAGE', 'ARTICLE', 'BANNER');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    -- Create content_entries table
    CREATE TABLE IF NOT EXISTS content_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type content_type NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
      slug VARCHAR(255) NOT NULL,
      title VARCHAR(255) NOT NULL,
      excerpt TEXT,
      body JSONB NOT NULL DEFAULT '{}'::jsonb,
      featured_image_url VARCHAR(1000),
      seo_title VARCHAR(255),
      seo_description TEXT,
      author_id UUID NOT NULL,
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('Database schema patched successfully');
} catch (e) {
  console.error(e);
} finally {
  await client.end();
}
