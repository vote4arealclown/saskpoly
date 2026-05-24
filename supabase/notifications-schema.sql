-- Run this in Supabase SQL Editor to add the notification center

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('pick','comment','user_joined','prediction_resolved','auto_resolve','invite_created')),
  title TEXT NOT NULL,
  message TEXT,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name TEXT,
  prediction_id UUID REFERENCES public.predictions(id) ON DELETE SET NULL,
  prediction_title TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Everyone can read notifications (admin will filter in UI)
CREATE POLICY "Notifications are viewable by everyone"
  ON public.notifications FOR SELECT USING (true);

-- Only admins can insert/delete notifications
CREATE POLICY "Only admins can insert notifications"
  ON public.notifications FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Only admins can update notifications"
  ON public.notifications FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Only admins can delete notifications"
  ON public.notifications FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Indexes for performance
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_type ON public.notifications(type);

-- Trigger: notify on pick insert
CREATE OR REPLACE FUNCTION public.notify_on_pick()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  pred_title TEXT;
BEGIN
  SELECT display_name INTO user_name FROM public.profiles WHERE id = NEW.user_id;
  SELECT title INTO pred_title FROM public.predictions WHERE id = NEW.prediction_id;

  INSERT INTO public.notifications (type, title, message, user_id, user_name, prediction_id, prediction_title)
  VALUES (
    'pick',
    COALESCE(user_name, 'Someone') || ' made a pick',
    'Picked "' || NEW.selected_option || '" on "' || COALESCE(pred_title, 'a prediction') || '"',
    NEW.user_id,
    user_name,
    NEW.prediction_id,
    pred_title
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_pick_insert
  AFTER INSERT ON public.picks
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_pick();

-- Trigger: notify on comment insert
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  pred_title TEXT;
BEGIN
  SELECT display_name INTO user_name FROM public.profiles WHERE id = NEW.user_id;
  SELECT title INTO pred_title FROM public.predictions WHERE id = NEW.prediction_id;

  INSERT INTO public.notifications (type, title, message, user_id, user_name, prediction_id, prediction_title)
  VALUES (
    'comment',
    COALESCE(user_name, 'Someone') || ' commented',
    LEFT(NEW.content, 80) || CASE WHEN LENGTH(NEW.content) > 80 THEN '...' ELSE '' END,
    NEW.user_id,
    user_name,
    NEW.prediction_id,
    pred_title
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_comment_insert
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

-- Trigger: notify on new profile (user joined)
CREATE OR REPLACE FUNCTION public.notify_on_user_joined()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (type, title, message, user_id, user_name)
  VALUES (
    'user_joined',
    COALESCE(NEW.display_name, NEW.email) || ' joined',
    'A new user signed up',
    NEW.id,
    NEW.display_name
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_insert
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_user_joined();
