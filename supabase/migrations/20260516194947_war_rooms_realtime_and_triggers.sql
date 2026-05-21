-- 1) Enable Realtime on the live-update tables so admin/portal UIs can subscribe
ALTER PUBLICATION supabase_realtime ADD TABLE public.war_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.war_room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 2) Auto-maintain war_rooms.last_message_at + unread counters on every message insert
CREATE OR REPLACE FUNCTION public.war_room_message_bump()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.war_room_id IS NULL THEN
    RETURN NEW;
  END IF;
  UPDATE public.war_rooms
  SET
    last_message_at = COALESCE(NEW.created_at, now()),
    unread_agent  = CASE WHEN NEW.sender_type = 'client' THEN COALESCE(unread_agent, 0) + 1 ELSE unread_agent END,
    unread_client = CASE WHEN NEW.sender_type = 'agent'  THEN COALESCE(unread_client, 0) + 1 ELSE unread_client END
  WHERE id = NEW.war_room_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS war_room_message_bump_trigger ON public.war_room_messages;
CREATE TRIGGER war_room_message_bump_trigger
AFTER INSERT ON public.war_room_messages
FOR EACH ROW
EXECUTE FUNCTION public.war_room_message_bump();

-- 3) Helper RPC: create a war room from a deal (idempotent — reuses if one already exists)
CREATE OR REPLACE FUNCTION public.create_war_room_for_deal(p_deal_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing uuid;
  v_client uuid;
  v_title text;
  v_new_id uuid;
BEGIN
  -- Reuse if already exists
  SELECT id INTO v_existing FROM public.war_rooms WHERE deal_id = p_deal_id LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  -- Pull deal context
  SELECT d.client_id,
         COALESCE(d.title, c.name || ' — Deal', 'Untitled Deal')
    INTO v_client, v_title
  FROM public.deals d
  LEFT JOIN public.clients c ON c.id = d.client_id
  WHERE d.id = p_deal_id;

  IF v_client IS NULL THEN
    RAISE EXCEPTION 'Deal % has no client_id', p_deal_id;
  END IF;

  INSERT INTO public.war_rooms (deal_id, client_id, name, status)
  VALUES (p_deal_id, v_client, v_title, 'active')
  RETURNING id INTO v_new_id;

  -- Seed with a system message so the timeline has a starting point
  INSERT INTO public.war_room_messages (war_room_id, sender_type, body, metadata)
  VALUES (v_new_id, 'system', 'War room created.', jsonb_build_object('event','room_created'));

  RETURN v_new_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_war_room_for_deal(uuid) TO authenticated;

-- 4) Mark-read helper for agent side
CREATE OR REPLACE FUNCTION public.mark_war_room_read(p_war_room_id uuid, p_side text DEFAULT 'agent')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_side = 'agent' THEN
    UPDATE public.war_rooms SET unread_agent = 0 WHERE id = p_war_room_id;
    UPDATE public.war_room_messages SET read_by_agent = true WHERE war_room_id = p_war_room_id AND read_by_agent IS NOT TRUE;
  ELSIF p_side = 'client' THEN
    UPDATE public.war_rooms SET unread_client = 0 WHERE id = p_war_room_id;
    UPDATE public.war_room_messages SET read_by_client = true WHERE war_room_id = p_war_room_id AND read_by_client IS NOT TRUE;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_war_room_read(uuid, text) TO authenticated;

-- 5) Helpful indexes for the realtime + admin queries
CREATE INDEX IF NOT EXISTS idx_war_room_messages_war_room_id_created
  ON public.war_room_messages (war_room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_war_rooms_deal_id ON public.war_rooms (deal_id);
CREATE INDEX IF NOT EXISTS idx_war_rooms_client_id_status ON public.war_rooms (client_id, status);

-- 6) Grants confirm authenticated role can use the tables (no-op if already granted)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.war_rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.war_room_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;