-- Create the toefl_sessions table for the dashboard
create table public.toefl_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  task_type varchar(50) not null check (task_type in ('Independent', 'Integrated')),
  duration_minutes numeric(5,2) not null,
  overall_score integer not null check (overall_score >= 0 and overall_score <= 30),
  delivery_score numeric(3,1) not null check (delivery_score >= 0 and delivery_score <= 4),
  language_use_score numeric(3,1) not null check (language_use_score >= 0 and language_use_score <= 4),
  topic_development_score numeric(3,1) not null check (topic_development_score >= 0 and topic_development_score <= 4),
  feedback text,
  transcript text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS) on the table
alter table public.toefl_sessions enable row level security;

-- Create Security Policies

-- 1. Users can only see their own sessions
create policy "Users can view their own toefl sessions" 
  on public.toefl_sessions for select 
  using (auth.uid() = user_id);

-- 2. Users can insert their own sessions
create policy "Users can insert their own toefl sessions" 
  on public.toefl_sessions for insert 
  with check (auth.uid() = user_id);

-- 3. Users can update their own sessions
create policy "Users can update their own toefl sessions" 
  on public.toefl_sessions for update 
  using (auth.uid() = user_id);

-- 4. Users can delete their own sessions
create policy "Users can delete their own toefl sessions" 
  on public.toefl_sessions for delete 
  using (auth.uid() = user_id);
