DROP TABLE IF EXISTS aviation_notification_areas;
DROP TABLE IF EXISTS aviation_safeguarding_surfaces;
DROP TABLE IF EXISTS aviation_runways;

-- Restore the pre-Milestone-C model behavior when rolling back.
UPDATE mcda_subtypes
SET is_active = TRUE,
    score_source = 'provisional — ICAO-adjacent aerodrome protection, pending GCAA'
WHERE subtype_key = 'aerodrome_proximity';
