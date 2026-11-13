-- ==============================================================================
-- ChefConnect Safe Incremental Migration: Chef Service Radius
-- Adds service_radius column to public.chef_profiles and refreshes chefs view
-- ==============================================================================

ALTER TABLE public.chef_profiles
ADD COLUMN IF NOT EXISTS service_radius NUMERIC(5, 1) DEFAULT 15.0;

-- Ensure view public.chefs exposes service_radius
CREATE OR REPLACE VIEW public.chefs AS 
SELECT * FROM public.chef_profiles;

