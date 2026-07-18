"""Phase C sensitivity-analysis tests (plan §6, Revision 2).

These run against an in-memory fake of the asyncpg pool, not a live database.
The fake dispatches on SQL text; for the three aggregate queries it computes
results with reference implementations (population stddev, the single zone-flip
definition, NULL-score exclusion). Because a fake cannot execute Postgres SQL,
each semantics test also asserts on the production SQL text itself (STDDEV_POP,
NULL filters, sweep scoping) so the reference implementation and the shipped
queries cannot silently diverge.
"""

import asyncio
import json
import statistics
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from statistics import mean

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services import drone_service
from app.services.drone_service import (
    _FACTOR_RANKING_SQL,
    _SWEEP_SUMMARY_SQL,
    _VOLATILITY_SQL,
    SWEEP_STALE_MINUTES,
    get_sensitivity_status,
    get_volatility_data,
    list_runs,
    trigger_sensitivity_analysis,
)


# ---------------------------------------------------------------------------
# Fake database / pool
# ---------------------------------------------------------------------------

def _now():
    return datetime.now(timezone.utc)


class FakeDB:
    def __init__(self):
        # run_id -> {"status", "region_id", "params": dict|None, "created_at",
        #            "label", "weights_snapshot"}
        self.runs = {}
        # run_id -> {h3_index: (total_score|None, final_zone)}
        self.cells = {}
        self.factors = [
            {"factor_key": k, "weight": 0.1667}
            for k in ["airspace_activity", "environmental", "infrastructure_sensitive",
                      "land_use", "population", "regulatory"]
        ]
        self.region_key = "guyana_region_4"

    def add_run(self, run_id=None, status="complete", params=None,
                created_at=None, label="run", region_id=2):
        run_id = run_id or str(uuid.uuid4())
        self.runs[run_id] = {
            "status": status, "region_id": region_id, "params": params,
            "created_at": created_at or _now(), "label": label,
            "weights_snapshot": "{}",
        }
        return run_id

    def sweep_children(self, sweep_id, complete_only=False):
        for rid, run in self.runs.items():
            p = run["params"] or {}
            if p.get("sweep_id") != sweep_id:
                continue
            if complete_only and run["status"] != "complete":
                continue
            yield rid, run

    # -- reference implementations of the three aggregate queries --

    def ranking_rows(self, base_run_id, sweep_id):
        base_cells = self.cells.get(base_run_id, {})
        groups = {}
        for rid, run in self.sweep_children(sweep_id, complete_only=True):
            p = run["params"]
            key = (p.get("sensitivity_factor"), p.get("sensitivity_direction"))
            for h3, (score, zone) in self.cells.get(rid, {}).items():
                if h3 not in base_cells:
                    continue
                bscore, bzone = base_cells[h3]
                if score is None or bscore is None:
                    continue
                g = groups.setdefault(key, {"devs": [], "flips": 0})
                g["devs"].append(abs(score - bscore))
                g["flips"] += 1 if zone != bzone else 0
        return [{"factor_key": k[0], "direction": k[1],
                 "mean_absolute_deviation": mean(g["devs"]) if g["devs"] else 0.0,
                 "zone_flips": g["flips"]}
                for k, g in groups.items()]

    def _per_cell(self, base_run_id, sweep_id):
        base_cells = self.cells.get(base_run_id, {})
        per_cell = {}
        for rid, run in self.sweep_children(sweep_id, complete_only=True):
            for h3, (score, zone) in self.cells.get(rid, {}).items():
                if h3 not in base_cells:
                    continue
                bscore, bzone = base_cells[h3]
                if score is None or bscore is None:
                    continue
                c = per_cell.setdefault(h3, {"scores": [], "flips": 0,
                                             "bscore": bscore, "bzone": bzone})
                c["scores"].append(score)
                c["flips"] += 1 if zone != bzone else 0
        return per_cell

    def summary_row(self, base_run_id, sweep_id):
        per_cell = self._per_cell(base_run_id, sweep_id)
        sds = [statistics.pstdev(c["scores"]) if len(c["scores"]) > 1 else 0.0
               for c in per_cell.values()]
        flipped = sum(1 for c in per_cell.values() if c["flips"] > 0)
        return {
            "avg_stddev": round(mean(sds), 4) if sds else 0,
            "max_stddev": round(max(sds), 4) if sds else 0,
            "total_zone_flips": sum(c["flips"] for c in per_cell.values()),
            "pct_cells_flipped": round(100.0 * flipped / len(per_cell), 2) if per_cell else 0,
        }

    def volatility_rows(self, base_run_id, sweep_id):
        rows = []
        for h3, c in self._per_cell(base_run_id, sweep_id).items():
            sd = statistics.pstdev(c["scores"]) if len(c["scores"]) > 1 else 0.0
            rows.append({
                "h3_index": h3,
                "stddev": round(sd, 4),
                "variance": round(statistics.pvariance(c["scores"]), 4)
                            if len(c["scores"]) > 1 else 0.0,
                "zone_flips": c["flips"],
                "baseline_zone": c["bzone"],
                "baseline_score": c["bscore"],
                "volatility_category": ("LOW" if sd < 0.15
                                        else "MEDIUM" if sd < 0.40 else "HIGH"),
            })
        return rows


class FakeConn:
    def __init__(self, db: FakeDB):
        self.db = db

    async def fetchrow(self, q, *args):
        if "SELECT status, region_id" in q:
            run = self.db.runs.get(args[0])
            return None if run is None else {"status": run["status"],
                                             "region_id": run["region_id"]}
        if "WITH per_cell" in q:
            return self.db.summary_row(args[0], args[1])
        raise AssertionError(f"Unexpected fetchrow: {q[:80]}")

    async def fetchval(self, q, *args):
        if "parent_run_id' = $1" in q:
            for rid, run in self.db.runs.items():
                p = run["params"] or {}
                if (p.get("parent_run_id") == args[0]
                        and run["status"] in ("pending", "running")):
                    return p.get("sweep_id")
            return None
        if "SELECT region_key" in q:
            return self.db.region_key
        if "SELECT 1 FROM mcda_model_runs" in q:
            return 1 if any(self.db.sweep_children(args[0])) else None
        raise AssertionError(f"Unexpected fetchval: {q[:80]}")

    async def fetch(self, q, *args):
        if "FROM mcda_factors WHERE is_active" in q:
            return sorted(self.db.factors, key=lambda f: f["factor_key"])
        if "mean_absolute_deviation" in q:
            return self.db.ranking_rows(args[0], args[1])
        if "volatility_category" in q:
            return self.db.volatility_rows(args[0], args[1])
        if "SELECT run_id::text, status" in q and "sweep_id" in q:
            return [{"run_id": rid, "status": run["status"]}
                    for rid, run in self.db.sweep_children(args[0])]
        if "(params->>'parent_run_id') IS NULL" in q:
            return [{"run_id": rid, "label": run["label"], "status": run["status"],
                     "weights_snapshot": run["weights_snapshot"],
                     "created_at": str(run["created_at"]), "completed_at": None}
                    for rid, run in self.db.runs.items()
                    if not (run["params"] or {}).get("parent_run_id")]
        raise AssertionError(f"Unexpected fetch: {q[:80]}")

    async def execute(self, q, *args):
        if "COALESCE(params, '{}'::jsonb)" in q:
            run = self.db.runs[args[0]]
            merged = dict(run["params"] or {})
            merged.update(json.loads(args[1]))
            run["params"] = merged
            return
        if "interval" in q and "SET status='failed'" in q:
            cutoff = _now() - timedelta(minutes=SWEEP_STALE_MINUTES)
            for rid, run in self.db.sweep_children(args[0]):
                if run["status"] in ("pending", "running") and run["created_at"] < cutoff:
                    run["status"] = "failed"
            return
        if "SET status='failed' WHERE run_id" in q:
            self.db.runs[args[0]]["status"] = "failed"
            return
        raise AssertionError(f"Unexpected execute: {q[:80]}")


class _AcquireCtx:
    def __init__(self, conn):
        self._conn = conn

    async def __aenter__(self):
        return self._conn

    async def __aexit__(self, *exc):
        return False


class FakePool:
    def __init__(self, db: FakeDB):
        self.db = db

    def acquire(self):
        return _AcquireCtx(FakeConn(self.db))


# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------

@pytest.fixture
def db():
    return FakeDB()


@pytest.fixture
def pool(db):
    return FakePool(db)


@pytest.fixture
def fake_create_run(db, monkeypatch):
    """Mimics the real create_run: registers a pending run whose params already
    carry the thresholds snapshot (the merge test depends on this)."""
    calls = []

    async def _create(pool, region_key, label, weight_overrides, created_by=None):
        calls.append({"region_key": region_key, "label": label,
                      "weight_overrides": weight_overrides})
        return db.add_run(status="pending", label=label,
                          params={"thresholds": [{"zone": "SUITABLE",
                                                  "score_min": 1.0, "score_max": 2.5}]})

    monkeypatch.setattr(drone_service, "create_run", _create)
    return calls


@pytest.fixture
def no_sweep_exec(monkeypatch):
    """Replace the background sweep with a recorder so tests stay deterministic."""
    launched = []

    async def _noop(pool, run_ids):
        launched.append(list(run_ids))

    monkeypatch.setattr(drone_service, "_execute_sweep", _noop)
    return launched


def make_sweep(db, n_children=2, sweep_id=None, base_run_id=None,
               statuses=None, factor_dirs=None):
    """Register a baseline plus n sweep children; returns (base_run_id, sweep_id)."""
    base_run_id = base_run_id or db.add_run(status="complete", label="baseline")
    sweep_id = sweep_id or str(uuid.uuid4())
    for i in range(n_children):
        factor, direction = (factor_dirs[i] if factor_dirs
                             else (f"factor_{i // 2}", "up" if i % 2 == 0 else "down"))
        db.add_run(
            status=(statuses[i] if statuses else "complete"),
            label=f"child {i}",
            params={"parent_run_id": base_run_id, "sweep_id": sweep_id,
                    "sensitivity_factor": factor, "sensitivity_direction": direction,
                    "sensitivity_delta": 0.10, "total_expected": n_children,
                    "thresholds": []},
        )
    return base_run_id, sweep_id


def child_ids(db, sweep_id):
    return [rid for rid, _ in db.sweep_children(sweep_id)]


# ---------------------------------------------------------------------------
# Tests (plan §6)
# ---------------------------------------------------------------------------

def test_sweep_id_scoping(pool, db):
    base_1, sweep_1 = make_sweep(db, n_children=2)
    base_2, sweep_2 = make_sweep(db, n_children=4, base_run_id=base_1)

    status_1 = asyncio.run(get_sensitivity_status(pool, base_1, sweep_1))
    status_2 = asyncio.run(get_sensitivity_status(pool, base_1, sweep_2))

    assert status_1["total_runs"] == 2
    assert status_2["total_runs"] == 4
    # Both aggregate queries are parameterized by sweep_id, not parent alone.
    for sql in (_FACTOR_RANKING_SQL, _SWEEP_SUMMARY_SQL, _VOLATILITY_SQL):
        assert "sweep_id' = $2" in sql


def test_flip_definition_consistent(pool, db):
    base, sweep = make_sweep(
        db, n_children=3,
        factor_dirs=[("population", "up"), ("population", "down"), ("land_use", "up")],
    )
    kids = child_ids(db, sweep)
    db.cells[base] = {"cell_a": (2.4, "SUITABLE")}
    # Flips in exactly two children; third stays in the baseline zone.
    db.cells[kids[0]] = {"cell_a": (2.6, "CONDITIONAL")}
    db.cells[kids[1]] = {"cell_a": (2.7, "CONDITIONAL")}
    db.cells[kids[2]] = {"cell_a": (2.45, "SUITABLE")}

    status = asyncio.run(get_sensitivity_status(pool, base, sweep))
    ranking_flips = sum(r["zone_flips"] for r in status["summary"]["factor_rankings"])
    volatility = asyncio.run(get_volatility_data(pool, base, sweep))

    assert ranking_flips == 2
    assert volatility[0]["zone_flips"] == 2
    assert status["summary"]["total_zone_flips"] == 2
    # Single flip definition: the same CASE fragment in every aggregate query.
    flip_fragment = "CASE WHEN c.final_zone != base.final_zone THEN 1 ELSE 0 END"
    for sql in (_FACTOR_RANKING_SQL, _SWEEP_SUMMARY_SQL, _VOLATILITY_SQL):
        assert flip_fragment in sql


def test_children_only_stddev(pool, db):
    base, sweep = make_sweep(db, n_children=3)
    kids = child_ids(db, sweep)
    db.cells[base] = {"cell_a": (2.3, "SUITABLE")}
    for kid, score in zip(kids, [2.0, 2.5, 3.0]):
        db.cells[kid] = {"cell_a": (score, "SUITABLE")}

    volatility = asyncio.run(get_volatility_data(pool, base, sweep))

    expected = statistics.pstdev([2.0, 2.5, 3.0])          # ≈ 0.4082
    with_baseline = statistics.pstdev([2.0, 2.5, 3.0, 2.3])
    sample = statistics.stdev([2.0, 2.5, 3.0])              # 0.5
    assert volatility[0]["stddev"] == pytest.approx(expected, abs=1e-4)
    assert volatility[0]["stddev"] != pytest.approx(with_baseline, abs=1e-4)
    assert volatility[0]["stddev"] != pytest.approx(sample, abs=1e-4)
    # Production SQL must use population statistics, never bare STDDEV/VARIANCE.
    for sql in (_SWEEP_SUMMARY_SQL, _VOLATILITY_SQL):
        assert "STDDEV_POP" in sql
        assert "STDDEV(" not in sql
    assert "VAR_POP" in _VOLATILITY_SQL
    assert "VARIANCE(" not in _VOLATILITY_SQL


def test_idempotent_trigger(pool, db, fake_create_run, no_sweep_exec):
    base, sweep = make_sweep(db, n_children=2, statuses=["running", "pending"])

    result = asyncio.run(trigger_sensitivity_analysis(pool, base, delta=0.10))

    assert result["sweep_id"] == sweep
    assert fake_create_run == []           # no new runs created
    assert no_sweep_exec == []             # no new sweep launched
    assert len(child_ids(db, sweep)) == 2


def test_staleness_marks_failed(pool, db):
    base, sweep = make_sweep(db, n_children=2, statuses=["complete", "pending"])
    stale_id = child_ids(db, sweep)[1]
    db.runs[stale_id]["created_at"] = _now() - timedelta(minutes=20)

    status = asyncio.run(get_sensitivity_status(pool, base, sweep))

    assert db.runs[stale_id]["status"] == "failed"
    assert status["failed_runs"] == 1
    assert status["status"] == "failed"    # no active children remain
    assert status["partial_results"] is True


def test_dynamic_factor_count(pool, db, fake_create_run, no_sweep_exec):
    db.factors = db.factors[:4]
    base = db.add_run(status="complete", label="baseline")

    result = asyncio.run(trigger_sensitivity_analysis(pool, base, delta=0.10))

    assert len(fake_create_run) == 8
    assert result["total_runs"] == 8
    assert no_sweep_exec == [child_ids(db, result["sweep_id"])]
    for rid, run in db.sweep_children(result["sweep_id"]):
        assert run["params"]["total_expected"] == 8


def test_list_runs_excludes_children(pool, db):
    base, sweep = make_sweep(db, n_children=4)

    rows = asyncio.run(list_runs(pool))

    assert [r["run_id"] for r in rows] == [base]


def test_volatility_categories(pool, db):
    base, sweep = make_sweep(db, n_children=2)
    kids = child_ids(db, sweep)
    # Two children scoring x±s give population stddev exactly s.
    spreads = {"cell_low": 0.05, "cell_med": 0.25, "cell_high": 0.50}
    db.cells[base] = {h3: (3.0, "CONDITIONAL") for h3 in spreads}
    db.cells[kids[0]] = {h3: (3.0 - s, "CONDITIONAL") for h3, s in spreads.items()}
    db.cells[kids[1]] = {h3: (3.0 + s, "CONDITIONAL") for h3, s in spreads.items()}

    volatility = asyncio.run(get_volatility_data(pool, base, sweep))
    by_cell = {r["h3_index"]: r["volatility_category"] for r in volatility}

    assert by_cell == {"cell_low": "LOW", "cell_med": "MEDIUM", "cell_high": "HIGH"}
    for boundary in ("< 0.15", "< 0.40"):
        assert boundary in _VOLATILITY_SQL


def test_params_merge_preserves_thresholds(pool, db, fake_create_run, no_sweep_exec):
    base = db.add_run(status="complete", label="baseline")

    result = asyncio.run(trigger_sensitivity_analysis(pool, base, delta=0.10))

    children = list(db.sweep_children(result["sweep_id"]))
    assert len(children) == 12
    for rid, run in children:
        assert run["params"]["thresholds"], "thresholds snapshot was clobbered"
        assert run["params"]["parent_run_id"] == base
        assert run["params"]["sensitivity_factor"]
        assert run["params"]["sensitivity_direction"] in ("up", "down")


def test_null_scores_excluded(pool, db):
    base, sweep = make_sweep(db, n_children=2)
    kids = child_ids(db, sweep)
    # cell_ok is scored; cell_locked is constraint-locked (NULL score) everywhere.
    db.cells[base] = {"cell_ok": (2.0, "SUITABLE"), "cell_locked": (None, "PROHIBITED")}
    for kid in kids:
        db.cells[kid] = {"cell_ok": (2.1, "SUITABLE"), "cell_locked": (None, "PROHIBITED")}

    volatility = asyncio.run(get_volatility_data(pool, base, sweep))
    status = asyncio.run(get_sensitivity_status(pool, base, sweep))

    assert [r["h3_index"] for r in volatility] == ["cell_ok"]
    assert all(r["volatility_category"] != "HIGH" for r in volatility)
    assert status["summary"]["total_zone_flips"] == 0
    # Both scored-aggregate queries must exclude NULL scores on either side.
    for sql in (_FACTOR_RANKING_SQL, _SWEEP_SUMMARY_SQL, _VOLATILITY_SQL):
        assert "c.total_score IS NOT NULL" in sql
        assert "base.total_score IS NOT NULL" in sql
