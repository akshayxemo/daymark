-- Runs once when the PostgreSQL data volume is first created.
-- Creates a separate database for the integration test suite so tests never
-- touch the development database.
CREATE DATABASE daymark_test;
GRANT ALL PRIVILEGES ON DATABASE daymark_test TO daymark;
