-- Defence in depth for hosted PostgreSQL providers (e.g. Supabase) that expose
-- the public schema through an auto-generated REST/GraphQL Data API.
--
-- Daymark never uses that API: the application connects as the table owner and
-- enforces ownership in its services and with composite foreign keys. Enabling
-- row-level security without any policy denies every non-owner role, so a leaked
-- or public "anon" key cannot read or change Daymark data. Table owners bypass
-- RLS, so the application is unaffected. On plain PostgreSQL this is harmless.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated';
  END IF;
END $$;
