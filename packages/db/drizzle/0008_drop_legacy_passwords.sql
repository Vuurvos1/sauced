-- 0003 carried the old argon2 hashes into "account", but Better Auth verifies with
-- scrypt, so they can never match. Drop them: those users sign in with Google or
-- use "forgot password", which recreates the credential account on reset.
-- Matching on the argon2 prefix keeps any scrypt password set since 0003 ran.
DELETE FROM "account" WHERE "provider_id" = 'credential' AND "password" LIKE '$argon2%';
