"""Persistence contract: atomic metadata only, with fit/held-out points distinguished."""

import json
from unittest.mock import AsyncMock, MagicMock

import pytest
from app.models.georef_models import AlignmentQcReport, GroundControlPoint
from app.repository.georef_repository import GeorefRepository
from app.services.georef_service import build_manifest
from test_georef_pipeline import network, request


def repository():
    pool = MagicMock()
    conn = MagicMock()
    conn.execute = AsyncMock()
    conn.executemany = AsyncMock()
    conn.fetchrow = AsyncMock()
    transaction = MagicMock()
    conn.transaction.return_value = transaction
    pool.acquire.return_value.__aenter__.return_value = conn
    return GeorefRepository(pool), conn, transaction


@pytest.mark.asyncio
async def test_manifest_run_and_points_use_one_transaction():
    repo, conn, transaction = repository()
    manifest = build_manifest(network(), request())
    qc = AlignmentQcReport(
        poster_id=manifest.poster_id, mode="recovery", status="passed", river_count=20
    )
    points = [
        GroundControlPoint(
            source_x=1, source_y=2, pixel_x=3, pixel_y=4, used_for_fit=fit
        )
        for fit in (True, False)
    ]
    await repo.save(manifest, qc, points)
    assert conn.execute.await_count == 2
    transaction.__aenter__.assert_awaited_once()
    data = conn.executemany.call_args.args[1]
    assert [row[-1] for row in data] == [True, False]
    assert all(row[0] == qc.run_id for row in data)
    source_ref = json.loads(conn.execute.call_args_list[0].args[-1])
    assert source_ref["geometry_in_manifest"] is False
    assert "features" not in source_ref


@pytest.mark.asyncio
async def test_gcp_failure_exits_transaction_with_error():
    repo, conn, transaction = repository()
    manifest = build_manifest(network(), request())
    qc = AlignmentQcReport(
        poster_id=manifest.poster_id, mode="recovery", status="passed", river_count=20
    )
    conn.executemany.side_effect = RuntimeError("write failed")
    with pytest.raises(RuntimeError, match="write failed"):
        await repo.save(
            manifest,
            qc,
            [GroundControlPoint(source_x=1, source_y=2, pixel_x=3, pixel_y=4)],
        )
    assert transaction.__aexit__.call_args.args[0] is RuntimeError


@pytest.mark.asyncio
async def test_manifest_read_restores_json_columns_and_version():
    repo, conn, _ = repository()
    manifest = build_manifest(network(), request())
    row = manifest.model_dump()
    row.pop("schema_version")  # v2 is the current schema's contract.
    for key, value in row.copy().items():
        if isinstance(value, (dict, list)):
            row[key] = json.dumps(value)
    conn.fetchrow.return_value = row
    assert await repo.get_manifest(manifest.poster_id) == manifest
