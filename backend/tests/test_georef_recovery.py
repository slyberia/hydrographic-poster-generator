import pytest
from PIL import Image
from app.models.georef_models import RecoveryOptions, GroundControlPoint
from app.services.georef_service import build_manifest
from app.services.georef_recovery import recover_result, fit_registration
from app.services.georef_benchmark import Recipe, evaluate, evaluate_wrong_source
from test_georef_pipeline import network, request


@pytest.mark.parametrize(
    "recipe",
    [
        Recipe("same"),
        Recipe("rotated", rotation=17),
        Recipe("rotated_90", rotation=90),
        Recipe("resized", scale_x=0.75, scale_y=0.75),
        Recipe("cropped", crop_fraction=0.1),
        Recipe("anisotropic", scale_x=0.85, scale_y=1.1),
        Recipe("affine_shear", shear_x=8, shear_y=-4),
        Recipe("jpeg", jpeg_quality=70),
        Recipe(
            "combined",
            rotation=-12,
            scale_x=0.9,
            scale_y=1.05,
            crop_fraction=0.05,
            jpeg_quality=80,
        ),
    ],
)
def test_registration_validates_heldout_and_ground_truth(recipe):
    clip = network()
    req = request()
    result = evaluate(clip, req, [recipe])["recipes"][0]
    assert result["status"] == "passed", result
    assert result["p95_error_pixels"] < 3, result
    assert result["qc"]["withheld_count"] >= 3


def test_blank_image_fails_closed():
    clip = network()
    m = build_manifest(clip, request())
    with pytest.raises(ValueError):
        recover_result(
            Image.new("RGBA", (1200, 1200), "white"), clip, m, RecoveryOptions()
        )


def test_collinear_gcps_are_rejected():
    m = build_manifest(network(), request())
    from app.services.georef_service import manifest_affine

    points = []
    for i in range(20):
        source = 100 + i * 20
        x, y = manifest_affine(m) * (source, source)
        points.append(
            GroundControlPoint(source_x=source, source_y=source, pixel_x=x, pixel_y=y)
        )
    with pytest.raises(ValueError):
        fit_registration(points, m, "affine", (1200, 1200))


def test_outside_image_gcps_are_rejected_before_fitting():
    m = build_manifest(network(), request())
    points = [
        GroundControlPoint(source_x=500, source_y=500, pixel_x=1e20, pixel_y=50)
        for _ in range(12)
    ]
    with pytest.raises(ValueError, match="inside"):
        fit_registration(points, m, "affine", (1200, 1200))


def test_benchmark_reports_phase7_evidence_and_rejects_projective_case():
    result = evaluate(
        network(), request(), [Recipe("shear", shear_x=8), Recipe("perspective", perspective=True)]
    )
    assert result["summary"]["successful_recovery_rate"] == 1
    assert result["summary"]["false_accept_count"] == 0
    assert result["summary"]["accuracy_boundaries"]["physical_capture_validation"].startswith("Not measured")
    assert result["recipes"][1]["status"] == "rejected"
    assert result["recipes"][0]["runtime_ms"] >= 0
    assert result["recipes"][0]["peak_memory_bytes"] > 0


def test_wrong_source_is_a_measured_negative():
    source = network()
    wrong = network()
    wrong.features = wrong.features[:8]
    result = evaluate_wrong_source(source, wrong, request())
    assert result["status"] == "rejected", result
