-- ==============================================================================
-- ChefConnect Migration: 20261112000002_dynamic_chef_food_catalog.sql
-- Description: Dynamic Chef-Based Food Categories & Menu Items API
-- - Connects chef registration and chef menu to customer discovery
-- - Database function to return distinct available food items from approved chefs
-- - Realtime publication verified for menu_items
-- ==============================================================================

-- 1. DATABASE RPC: GET DISTINCT AVAILABLE FOOD ITEMS FROM APPROVED CHEFS
CREATE OR REPLACE FUNCTION public.get_distinct_available_food_items()
RETURNS TABLE (
  id TEXT,
  name TEXT,
  category TEXT,
  chef_ids UUID[],
  chef_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH approved_menu_items AS (
    SELECT 
      m.id AS item_id,
      TRIM(m.service_name) AS item_name,
      COALESCE(NULLIF(TRIM(m.category_name), ''), 'General') AS cat_name,
      m.chef_id
    FROM public.menu_items m
    INNER JOIN public.chef_profiles c ON c.id = m.chef_id
    WHERE m.is_active = true
      AND c.status = 'approved'
  )
  SELECT 
    MIN(ami.item_id::text) AS id,
    ami.item_name AS name,
    ami.cat_name AS category,
    ARRAY_AGG(DISTINCT ami.chef_id) AS chef_ids,
    COUNT(DISTINCT ami.chef_id)::INTEGER AS chef_count
  FROM approved_menu_items ami
  GROUP BY LOWER(ami.item_name), ami.item_name, ami.cat_name
  HAVING COUNT(DISTINCT ami.chef_id) > 0
  ORDER BY ami.cat_name ASC, ami.item_name ASC;
END;
$$;

-- 2. DATABASE RPC: GET CHEF REGISTERED FOOD CATEGORIES
CREATE OR REPLACE FUNCTION public.get_chef_registered_categories()
RETURNS TABLE (
  category_name TEXT,
  chef_count INTEGER,
  item_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(NULLIF(TRIM(m.category_name), ''), 'General') AS category_name,
    COUNT(DISTINCT m.chef_id)::INTEGER AS chef_count,
    COUNT(m.id)::INTEGER AS item_count
  FROM public.menu_items m
  INNER JOIN public.chef_profiles c ON c.id = m.chef_id
  WHERE m.is_active = true
    AND c.status = 'approved'
  GROUP BY COALESCE(NULLIF(TRIM(m.category_name), ''), 'General')
  HAVING COUNT(DISTINCT m.chef_id) > 0
  ORDER BY category_name ASC;
END;
$$;

-- 3. PERMISSIONS AND GRANTS
REVOKE ALL ON FUNCTION public.get_distinct_available_food_items() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_distinct_available_food_items() TO authenticated, anon;

REVOKE ALL ON FUNCTION public.get_chef_registered_categories() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_chef_registered_categories() TO authenticated, anon;

-- 4. REALTIME PUBLICATION VERIFICATION FOR MENU_ITEMS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'menu_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;
  END IF;
END $$;

