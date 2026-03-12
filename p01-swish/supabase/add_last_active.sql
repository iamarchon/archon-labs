-- Add last_active column for streak tracking
alter table users add column if not exists last_active date;
