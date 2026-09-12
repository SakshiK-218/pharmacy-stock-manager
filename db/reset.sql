TRUNCATE items, batches, dispense_log RESTART IDENTITY CASCADE;

\i ../db/seed.sql
--\i tells psql to run another .sql file..in this case its the seed file