-- Region 4 public-safety and government reference data.
--
-- These records are public-map context only. Their subtypes remain inactive so
-- the MCDA engine cannot use them in a model run or zoning classification.

INSERT INTO mcda_layers (
    layer_key, table_name, geom_type, factor_id, source, confidence, license_note, is_active
) VALUES
    (
        'osm_public_safety_facilities', 'src_public_safety_facilities', 'point', NULL,
        'OpenStreetMap, curated against Guyana Fire Service and Guyana Police Force public listings',
        'proxy_osm',
        'OpenStreetMap data © OpenStreetMap contributors, available under ODbL. Reference display only.',
        TRUE
    ),
    (
        'osm_government_facilities', 'src_government_facilities', 'point', NULL,
        'OpenStreetMap, curated to office=government and amenity=townhall features only',
        'proxy_osm',
        'OpenStreetMap data © OpenStreetMap contributors, available under ODbL. Reference display only.',
        TRUE
    )
ON CONFLICT (layer_key) DO UPDATE SET
    table_name = EXCLUDED.table_name,
    geom_type = EXCLUDED.geom_type,
    factor_id = EXCLUDED.factor_id,
    source = EXCLUDED.source,
    confidence = EXCLUDED.confidence,
    license_note = EXCLUDED.license_note,
    is_active = TRUE;

INSERT INTO mcda_subtypes (
    subtype_key, subtype_name, factor_id, treatment, default_score,
    reason_template, score_source, is_active
) VALUES
    (
        'police', 'Police facility (reference-only)',
        (SELECT factor_id FROM mcda_factors WHERE factor_key = 'infrastructure_sensitive'),
        'factor', NULL,
        'Police facility reference context: {name}',
        'Reference-only. Inactive by design; not evaluated by MCDA.',
        FALSE
    ),
    (
        'fire_station', 'Fire service facility (reference-only)',
        (SELECT factor_id FROM mcda_factors WHERE factor_key = 'infrastructure_sensitive'),
        'factor', NULL,
        'Fire service facility reference context: {name}',
        'Reference-only. Inactive by design; not evaluated by MCDA.',
        FALSE
    ),
    (
        'government_facility', 'Government facility (reference-only)',
        (SELECT factor_id FROM mcda_factors WHERE factor_key = 'infrastructure_sensitive'),
        'factor', NULL,
        'Government facility reference context: {name}',
        'Reference-only. Inactive by design; not evaluated by MCDA.',
        FALSE
    )
ON CONFLICT (subtype_key) DO UPDATE SET
    subtype_name = EXCLUDED.subtype_name,
    factor_id = EXCLUDED.factor_id,
    treatment = EXCLUDED.treatment,
    default_score = EXCLUDED.default_score,
    default_buffer_m = NULL,
    default_zone = NULL,
    reason_template = EXCLUDED.reason_template,
    score_source = EXCLUDED.score_source,
    is_active = FALSE;

WITH curated_features (
    layer_key, subtype_key, name, longitude, latitude, osm_type, osm_id,
    reference_category, source_reference, verification_note
) AS (
    VALUES
        ('osm_public_safety_facilities', 'fire_station', 'Guyana Fire Service Headquarters', -58.16798, 6.80901, 'way', '403160280', 'fire',
         'https://www.openstreetmap.org/way/403160280',
         'OSM location cross-checked against the Guyana Fire Service public location listing (Lot 11A Water Street, Georgetown).'),
        ('osm_public_safety_facilities', 'fire_station', 'Alberttown Fire Station', -58.15259, 6.81319, 'node', '4511392990', 'fire',
         'https://www.openstreetmap.org/node/4511392990',
         'OSM location cross-checked against the Guyana Fire Service public location listing (Albert Street, Alberttown).'),
        ('osm_public_safety_facilities', 'fire_station', 'West Ruimveldt Fire Station', -58.15722, 6.79393, 'node', '4535559990', 'fire',
         'https://www.openstreetmap.org/node/4535559990',
         'OSM location cross-checked against the Guyana Fire Service public location listing (Cactus Street and Ebenezer Drive).'),
        ('osm_public_safety_facilities', 'fire_station', 'Mahaica Fire Station', -57.91984, 6.67643, 'way', '443674843', 'fire',
         'https://www.openstreetmap.org/way/443674843',
         'OSM location cross-checked against the Guyana Fire Service public location listing (Helena No. 1, Mahaica).'),
        ('osm_public_safety_facilities', 'police', 'City Police', -58.16466, 6.81103, 'way', '402568920', 'police',
         'https://www.openstreetmap.org/way/402568920',
         'Curated OSM police facility; reference-only and not an operational-status assertion.'),
        ('osm_public_safety_facilities', 'police', 'Police Mounted Branch', -58.15882, 6.82074, 'way', '403109695', 'police',
         'https://www.openstreetmap.org/way/403109695',
         'Curated OSM police facility; reference-only and not an operational-status assertion.'),
        ('osm_public_safety_facilities', 'police', 'Enmore Police Station', -57.99158, 6.76126, 'way', '443826898', 'police',
         'https://www.openstreetmap.org/way/443826898',
         'Name cross-checked against the Guyana Police Force Region 4C public station listing.'),
        ('osm_public_safety_facilities', 'police', 'Mahaica Police Station', -57.91993, 6.67542, 'node', '3778715876', 'police',
         'https://www.openstreetmap.org/node/3778715876',
         'Name cross-checked against the Guyana Police Force Region 4C public station listing.'),
        ('osm_public_safety_facilities', 'police', 'Cane Grove Police', -57.91767, 6.62551, 'node', '957708535', 'police',
         'https://www.openstreetmap.org/node/957708535',
         'Name cross-checked against the Guyana Police Force Region 4C public station listing.'),
        ('osm_government_facilities', 'government_facility', 'Ministry of Local Government', -58.16406, 6.82428, 'way', '1464006667', 'government',
         'https://www.openstreetmap.org/way/1464006667',
         'Curated OSM office=government feature; no regulatory or classification effect.'),
        ('osm_government_facilities', 'government_facility', 'Georgetown City Hall', -58.16499, 6.81111, 'way', '402568917', 'government',
         'https://www.openstreetmap.org/way/402568917',
         'Curated OSM amenity=townhall feature; no regulatory or classification effect.')
)
INSERT INTO mcda_features (layer_id, subtype_key, name, attrs, geom)
SELECT
    layer.layer_id,
    feature.subtype_key,
    feature.name,
    jsonb_build_object(
        'source_key', 'osm:' || feature.osm_type || ':' || feature.osm_id,
        'osm_type', feature.osm_type,
        'osm_id', feature.osm_id,
        'reference_category', feature.reference_category,
        'classification_effect', 'none',
        'confidence', 'proxy_osm',
        'source', 'OpenStreetMap (curated Region 4 reference data)',
        'source_reference', feature.source_reference,
        'verification_note', feature.verification_note,
        'curated_at', '2026-08-18'
    ),
    ST_SetSRID(ST_MakePoint(feature.longitude, feature.latitude), 4326)
FROM curated_features AS feature
JOIN mcda_layers AS layer ON layer.layer_key = feature.layer_key
WHERE NOT EXISTS (
    SELECT 1
    FROM mcda_features AS existing
    WHERE existing.attrs->>'source_key' = 'osm:' || feature.osm_type || ':' || feature.osm_id
);
