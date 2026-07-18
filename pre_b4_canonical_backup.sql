-- PRE-B4 CANONICAL DATABASE BACKUP

-- mcda_region_boundary
INSERT INTO mcda_region_boundary (region_id, region_key, region_name, geom, created_at) VALUES (2, 'guyana_region_4', 'Demerara-Mahaica', ST_GeomFromText('MULTIPOLYGON(((-58.2 6.75,-58.1 6.75,-58.1 6.85,-58.2 6.85,-58.2 6.75)))', 4326), '2026-07-16T23:15:55.193099+00:00') ON CONFLICT (region_id) DO NOTHING;

-- mcda_grid
INSERT INTO mcda_grid (h3_index, resolution, region_id, geom, centroid, created_at) VALUES ('896b54a01c3ffff', 9, 2, ST_GeomFromText('POLYGON((-58.17 6.8,-58.16 6.8,-58.16 6.81,-58.17 6.81,-58.17 6.8))', 4326), NULL, '2026-07-16T23:15:55.396736+00:00') ON CONFLICT (h3_index) DO NOTHING;

-- mcda_features
INSERT INTO mcda_features (feature_id, layer_id, subtype_key, name, attrs, geom, created_at) VALUES (5, 5, 'hospital', 'Georgetown Public Hospital', '"{\"size_class\": \"large\"}"'::jsonb, ST_GeomFromText('POINT(-58.165 6.805)', 4326), '2026-07-16T23:15:55.688864+00:00') ON CONFLICT (feature_id) DO NOTHING;
INSERT INTO mcda_features (feature_id, layer_id, subtype_key, name, attrs, geom, created_at) VALUES (6, 2, 'population_density', 'Low density sector', '"{}"'::jsonb, ST_GeomFromText('POINT(-58.165 6.805)', 4326), '2026-07-16T23:15:55.959251+00:00') ON CONFLICT (feature_id) DO NOTHING;
INSERT INTO mcda_features (feature_id, layer_id, subtype_key, name, attrs, geom, created_at) VALUES (7, 3, 'lu_water', 'Demerara River portion', '"{}"'::jsonb, ST_GeomFromText('POINT(-58.165 6.805)', 4326), '2026-07-16T23:15:56.230041+00:00') ON CONFLICT (feature_id) DO NOTHING;