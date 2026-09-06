import type { GeorefViewer } from "./georefApi";

/** SVG uses downwards Y; projected map coordinates use upwards Y. */
export function georefPlacement(view: GeorefViewer) {
  const [a,b,c,d,e,f] = view.pixel_to_world;
  if (view.crs !== "EPSG:3857" || ![a,b,c,d,e,f,view.width,view.height].every(Number.isFinite)
    || view.width <= 0 || view.height <= 0 || Math.abs(a*e-b*d) < 1e-12) throw new Error("Invalid raster placement");
  const corners = [[0,0],[view.width,0],[0,view.height],[view.width,view.height]]
    .map(([x,y]) => [a*x+b*y+c,d*x+e*y+f]);
  const west=Math.min(...corners.map(p=>p[0])), east=Math.max(...corners.map(p=>p[0]));
  const south=Math.min(...corners.map(p=>p[1])), north=Math.max(...corners.map(p=>p[1]));
  return {west,east,south,north,viewBox:`${west} ${-north} ${east-west} ${north-south}`,
    matrix:`matrix(${a} ${-d} ${b} ${-e} ${c} ${-f})`};
}
