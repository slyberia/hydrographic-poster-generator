from fastapi import APIRouter, Depends, HTTPException
import asyncpg
from typing import List

from app.database import get_db_pool
from app.models.geography_models import (
    GeographyListResponse, 
    GeographyRegion, 
    GeographyCountry, 
    GeographyDetail
)

router = APIRouter()

REGION_NAMES = {
    "south_america": "South America",
    "north_central_america": "North & Central America"
}

@router.get("", response_model=GeographyListResponse)
async def list_geographies(pool: asyncpg.Pool = Depends(get_db_pool)):
    """
    Returns a hierarchical list of regions and countries available in the database.
    Only includes Admin 0 (country) level boundaries to populate the top-level picker.
    """
    query = """
        SELECT id, name, country, country_code, region_code
        FROM admin_boundaries
        WHERE admin_level = 0
        ORDER BY region_code, name;
    """
    
    async with pool.acquire() as conn:
        rows = await conn.fetch(query)
        
    regions_dict = {}
    for row in rows:
        region_code = row['region_code']
        if region_code not in regions_dict:
            regions_dict[region_code] = GeographyRegion(
                region_code=region_code,
                name=REGION_NAMES.get(region_code, region_code.replace('_', ' ').title()),
                countries=[]
            )
            
        regions_dict[region_code].countries.append(
            GeographyCountry(
                country_code=row['country_code'],
                name=row['name'],
                admin_0_id=str(row['id'])
            )
        )
        
    return GeographyListResponse(regions=list(regions_dict.values()))


@router.get("/{geography_id}", response_model=GeographyDetail)
async def get_geography(geography_id: str, pool: asyncpg.Pool = Depends(get_db_pool)):
    """
    Returns metadata for a specific geography, including its bounding box.
    Does NOT return the full geometry (that is used internally for clipping).
    """
    # Note: ST_Extent or ST_Envelope could be used. ST_Extent aggregates, ST_Envelope works on single geom.
    # We use Box2D and extract coordinates, or ST_XMin, ST_YMin, etc.
    query = """
        SELECT 
            id, name, country, country_code, admin_level, parent_id, region_code,
            ST_XMin(geom) as min_lon,
            ST_YMin(geom) as min_lat,
            ST_XMax(geom) as max_lon,
            ST_YMax(geom) as max_lat
        FROM admin_boundaries
        WHERE id = $1;
    """
    
    try:
        uuid_id = geography_id # In PostgreSQL, UUID string is fine
        async with pool.acquire() as conn:
            row = await conn.fetchrow(query, uuid_id)
            
        if not row:
            raise HTTPException(status_code=404, detail="Geography not found")
            
        return GeographyDetail(
            id=str(row['id']),
            name=row['name'],
            country=row['country'],
            country_code=row['country_code'],
            admin_level=row['admin_level'],
            parent_id=str(row['parent_id']) if row['parent_id'] else None,
            region_code=row['region_code'],
            bbox=[row['min_lon'], row['min_lat'], row['max_lon'], row['max_lat']]
        )
    except asyncpg.exceptions.DataError:
        raise HTTPException(status_code=400, detail="Invalid geography ID format")


@router.get("/{geography_id}/children", response_model=List[GeographyDetail])
async def list_geography_children(geography_id: str,
                                  pool: asyncpg.Pool = Depends(get_db_pool)):
    """
    Returns the direct child boundaries of a geography (e.g. Admin 1 areas of
    a country). Returns an empty list when no children have been imported —
    the frontend uses this to decide whether to render deeper pickers.
    """
    query = """
        SELECT
            id, name, country, country_code, admin_level, parent_id, region_code,
            ST_XMin(geom) as min_lon,
            ST_YMin(geom) as min_lat,
            ST_XMax(geom) as max_lon,
            ST_YMax(geom) as max_lat
        FROM admin_boundaries
        WHERE parent_id = $1
        ORDER BY name;
    """

    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(query, geography_id)
    except asyncpg.exceptions.DataError:
        raise HTTPException(status_code=400, detail="Invalid geography ID format")

    return [
        GeographyDetail(
            id=str(row['id']),
            name=row['name'],
            country=row['country'],
            country_code=row['country_code'],
            admin_level=row['admin_level'],
            parent_id=str(row['parent_id']) if row['parent_id'] else None,
            region_code=row['region_code'],
            bbox=[row['min_lon'], row['min_lat'], row['max_lon'], row['max_lat']]
        )
        for row in rows
    ]


@router.get("/search/", response_model=List[GeographyDetail])
async def search_geographies(q: str, pool: asyncpg.Pool = Depends(get_db_pool)):
    """
    Simple text search fallback for geographies.
    """
    if len(q) < 3:
        return []
        
    query = """
        SELECT 
            id, name, country, country_code, admin_level, parent_id, region_code,
            ST_XMin(geom) as min_lon,
            ST_YMin(geom) as min_lat,
            ST_XMax(geom) as max_lon,
            ST_YMax(geom) as max_lat
        FROM admin_boundaries
        WHERE name ILIKE $1 OR country ILIKE $1
        ORDER BY admin_level ASC, name ASC
        LIMIT 20;
    """
    
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, f"%{q}%")
        
    results = []
    for row in rows:
        results.append(GeographyDetail(
            id=str(row['id']),
            name=row['name'],
            country=row['country'],
            country_code=row['country_code'],
            admin_level=row['admin_level'],
            parent_id=str(row['parent_id']) if row['parent_id'] else None,
            region_code=row['region_code'],
            bbox=[row['min_lon'], row['min_lat'], row['max_lon'], row['max_lat']]
        ))
        
    return results
