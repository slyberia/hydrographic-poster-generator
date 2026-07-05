DENSITY_PRESETS = {
    "balanced": {
        "id": "balanced",
        "name": "Balanced",
        "min_stream_order": 3,
        "description": "Elegant, readable hierarchy. Emphasizes major/primary/secondary rivers.",
        "classification_map": {
            10: "major", 9: "major",
            8: "primary", 7: "primary",
            6: "secondary", 5: "secondary",
            4: "minor", 3: "minor",
        }
    },
    "detailed": {
        "id": "detailed",
        "name": "Detailed",
        "min_stream_order": 2,
        "description": "More network complexity. Includes minor features.",
        "classification_map": {
            10: "major", 9: "major",
            8: "primary", 7: "primary",
            6: "secondary", 5: "secondary",
            4: "minor", 3: "minor",
            2: "headwater",
        }
    },
    "dense": {
        "id": "dense",
        "name": "Full Network",
        "min_stream_order": 1,
        "description": "Maximum hydrographic texture. All stream orders.",
        "classification_map": {
            10: "major", 9: "major",
            8: "primary", 7: "primary",
            6: "secondary", 5: "secondary",
            4: "minor", 3: "minor",
            2: "headwater", 1: "headwater",
        }
    }
}
