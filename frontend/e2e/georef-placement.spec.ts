import { test, expect } from "@playwright/test";
import { georefPlacement } from "../src/lib/georefPlacement";

test("SVG placement preserves rotated/sheared affine axes", () => {
  const position = georefPlacement({ width: 100, height: 200, crs: "EPSG:3857",
    pixel_to_world: [2, 1, 1000, 0.5, -3, 2000], png_base64: "" });
  expect(position).toEqual({ west: 1000, east: 1400, south: 1400, north: 2050,
    viewBox: "1000 -2050 400 650", matrix: "matrix(2 -0.5 1 3 1000 -2000)" });
});

test("invalid placement is rejected", () => {
  expect(() => georefPlacement({width: 10, height: 10, crs: "EPSG:3857",
    pixel_to_world: [1, 2, 0, 2, 4, 0], png_base64: ""})).toThrow("Invalid raster placement");
});
