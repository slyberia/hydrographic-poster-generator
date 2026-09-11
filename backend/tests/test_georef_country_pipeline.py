import json

from app.services.georef_country_pipeline import load_registry, review_registered_countries


def test_registry_covers_existing_evaluated_countries():
    registry = load_registry()
    assert {item["slug"] for item in registry["countries"]} == {
        "belize", "costa-rica", "guyana", "jamaica", "suriname"
    }


def test_review_reproduces_existing_country_statuses_and_flags_limitations():
    results = review_registered_countries()
    assert {item["country_code"] for item in results} == {"BZ", "CRI", "GY", "JAM", "SUR"}
    by_code = {item["country_code"]: item for item in results}
    assert by_code["CRI"]["disposition"] == "accepted"
    assert by_code["BZ"]["disposition"] == "accepted_with_limitations"
    assert by_code["JAM"]["disposition"] == "accepted_with_limitations"
    assert by_code["SUR"]["disposition"] == "accepted_with_limitations"
    assert by_code["GY"]["disposition"] == "review_required"


def test_review_output_is_json_serializable():
    assert json.dumps(review_registered_countries())
