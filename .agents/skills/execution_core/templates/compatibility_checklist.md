# Compatibility Checklist

## API

- [ ] Legacy request still accepted
- [ ] New request accepted
- [ ] Both supplied consistently handled
- [ ] Contradictory combination rejected explicitly
- [ ] Response fields remain compatible
- [ ] Error response remains compatible or versioned

## Frontend State

- [ ] Existing storage keys inventoried
- [ ] Versioned migration implemented
- [ ] Malformed storage handled
- [ ] Unrelated settings preserved
- [ ] Old browser session tested

## Deployment

- [ ] Old frontend against new backend tested
- [ ] New frontend with compatibility backend tested
- [ ] Feature-disabled path tested
- [ ] Rollback path tested

## Rendering and Export

- [ ] Preview/export parity verified
- [ ] Manifest preserves reproducibility
- [ ] Cache keys include new normalized settings
- [ ] Debug and sensitivity routes reviewed

## Deprecation

- [ ] Legacy usage measured or inventoried
- [ ] Removal is in a separate approved phase
- [ ] Human approval recorded
