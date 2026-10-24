-- Fixes a Supabase security advisor warning: the SAWPRS guard trigger function had no fixed search_path.
-- Run once, after 0008_payouts.sql. Already applied to the live project.
alter function private.guard_sawprs() set search_path = public;
