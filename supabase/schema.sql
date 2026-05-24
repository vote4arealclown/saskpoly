-- ============================================================
-- SaskPoly Pivoted Schema: Friends-only Predictions App
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  total_points INTEGER NOT NULL DEFAULT 0,
  correct_picks INTEGER NOT NULL DEFAULT 0,
  total_picks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- PREDICTIONS
-- ============================================================
CREATE TABLE public.predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('sports', 'stocks')),
  event_type TEXT NOT NULL, -- e.g. 'nba_game', 'nfl_game', 'stock_price'
  source_api TEXT, -- 'espn', 'manual', etc.
  source_id TEXT, -- external API identifier
  event_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'resolved', 'cancelled')),
  options TEXT[] NOT NULL DEFAULT '{}',
  resolved_option TEXT, -- which option was correct
  points INTEGER NOT NULL DEFAULT 10, -- points for correct pick
  image_url TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution_source TEXT -- URL or note about how it was resolved
);

-- ============================================================
-- PICKS (user predictions)
-- ============================================================
CREATE TABLE public.picks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  prediction_id UUID NOT NULL REFERENCES public.predictions(id) ON DELETE CASCADE,
  selected_option TEXT NOT NULL,
  points_earned INTEGER DEFAULT 0,
  is_correct BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, prediction_id)
);

-- ============================================================
-- COMMENTS
-- ============================================================
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  prediction_id UUID NOT NULL REFERENCES public.predictions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Profiles: users can read all, update only own
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Predictions: everyone can read, only admin can insert/update/delete
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Predictions are viewable by everyone"
  ON public.predictions FOR SELECT USING (true);

CREATE POLICY "Only admins can insert predictions"
  ON public.predictions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Only admins can update predictions"
  ON public.predictions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Only admins can delete predictions"
  ON public.predictions FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Picks: users can read own + others (for transparency), insert own, can't update/delete
ALTER TABLE public.picks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Picks are viewable by everyone"
  ON public.picks FOR SELECT USING (true);

CREATE POLICY "Users can insert own picks"
  ON public.picks FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Comments: everyone can read, authenticated users can insert own, update own
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by everyone"
  ON public.comments FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert comments"
  ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON public.comments FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Update profile stats when a prediction is resolved
CREATE OR REPLACE FUNCTION public.calculate_leaderboard()
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles p
  SET
    total_picks = sub.total,
    correct_picks = sub.correct,
    total_points = COALESCE(sub.points, 0)
  FROM (
    SELECT
      user_id,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE is_correct = true) AS correct,
      SUM(points_earned) AS points
    FROM public.picks
    GROUP BY user_id
  ) sub
  WHERE p.id = sub.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update prediction timestamps
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_predictions_updated_at
  BEFORE UPDATE ON public.predictions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_predictions_status ON public.predictions(status);
CREATE INDEX idx_predictions_category ON public.predictions(category);
CREATE INDEX idx_predictions_event_date ON public.predictions(event_date);
CREATE INDEX idx_picks_user_id ON public.picks(user_id);
CREATE INDEX idx_picks_prediction_id ON public.picks(prediction_id);
CREATE INDEX idx_comments_prediction_id ON public.comments(prediction_id);
CREATE INDEX idx_profiles_points ON public.profiles(total_points DESC);

-- Login streak columns (run this in Supabase SQL Editor if not already applied)
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS login_streak INTEGER NOT NULL DEFAULT 0;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_date DATE;

-- Blog / Posts Schema
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  excerpt TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Anyone logged in can view published posts
CREATE POLICY "Posts are viewable by logged-in users"
  ON public.posts FOR SELECT USING (auth.role() = 'authenticated' AND published = true);

-- Authors can view their own drafts too
CREATE POLICY "Authors can view their own posts"
  ON public.posts FOR SELECT USING (auth.uid() = author_id);

-- Only authors can insert (enforced in API by email check)
CREATE POLICY "Authors can insert posts"
  ON public.posts FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Authors can update their own posts
CREATE POLICY "Authors can update their own posts"
  ON public.posts FOR UPDATE USING (auth.uid() = author_id);

-- Authors can delete their own posts
CREATE POLICY "Authors can delete their own posts"
  ON public.posts FOR DELETE USING (auth.uid() = author_id);

CREATE INDEX idx_posts_slug ON public.posts(slug);
CREATE INDEX idx_posts_published ON public.posts(published, created_at DESC);
