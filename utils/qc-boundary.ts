/**
 * Quezon City boundary helpers backed by the administrative GeoJSON outline.
 */

import { qcGeoJson } from '@/data/qc-geojson';

export type QCCoordinate = {
  latitude: number;
  longitude: number;
};

const QC_BOUNDARY_COORDINATES: QCCoordinate[] =
  qcGeoJson.features[0].geometry.coordinates[0].map((coord: number[]) => ({
    latitude: coord[1],
    longitude: coord[0],
  }));

const QC_BOUNDS = QC_BOUNDARY_COORDINATES.reduce(
  (bounds, point) => ({
    south: Math.min(bounds.south, point.latitude),
    north: Math.max(bounds.north, point.latitude),
    west: Math.min(bounds.west, point.longitude),
    east: Math.max(bounds.east, point.longitude),
  }),
  {
    south: Number.POSITIVE_INFINITY,
    north: Number.NEGATIVE_INFINITY,
    west: Number.POSITIVE_INFINITY,
    east: Number.NEGATIVE_INFINITY,
  },
);

function isPointOnSegment(point: QCCoordinate, start: QCCoordinate, end: QCCoordinate) {
  const cross =
    (point.latitude - start.latitude) * (end.longitude - start.longitude) -
    (point.longitude - start.longitude) * (end.latitude - start.latitude);
  if (Math.abs(cross) > 1e-10) return false;

  return (
    point.latitude >= Math.min(start.latitude, end.latitude) - 1e-10 &&
    point.latitude <= Math.max(start.latitude, end.latitude) + 1e-10 &&
    point.longitude >= Math.min(start.longitude, end.longitude) - 1e-10 &&
    point.longitude <= Math.max(start.longitude, end.longitude) + 1e-10
  );
}

export function getQCBoundaryCoordinates(): QCCoordinate[] {
  return QC_BOUNDARY_COORDINATES.map((point) => ({ ...point }));
}

export function isCoordinateInsideQCBoundary(point: QCCoordinate) {
  if (
    point.latitude < QC_BOUNDS.south ||
    point.latitude > QC_BOUNDS.north ||
    point.longitude < QC_BOUNDS.west ||
    point.longitude > QC_BOUNDS.east
  ) {
    return false;
  }

  let inside = false;
  for (
    let currentIndex = 0, previousIndex = QC_BOUNDARY_COORDINATES.length - 1;
    currentIndex < QC_BOUNDARY_COORDINATES.length;
    previousIndex = currentIndex++
  ) {
    const current = QC_BOUNDARY_COORDINATES[currentIndex];
    const previous = QC_BOUNDARY_COORDINATES[previousIndex];

    if (isPointOnSegment(point, previous, current)) return true;

    const crossesLatitude =
      current.latitude > point.latitude !== previous.latitude > point.latitude;
    const longitudeAtCrossing =
      ((previous.longitude - current.longitude) *
        (point.latitude - current.latitude)) /
        (previous.latitude - current.latitude) +
      current.longitude;

    if (crossesLatitude && point.longitude < longitudeAtCrossing) {
      inside = !inside;
    }
  }

  return inside;
}