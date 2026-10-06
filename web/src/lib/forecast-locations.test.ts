import { describe, expect, it } from "vitest";

import { selectAreas, type ForecastArea } from "./forecast-locations";

const areas: ForecastArea[] = [
  { areaCode: "6300000", areaName: "臺北市" },
  { areaCode: "6300000", areaName: "臺北市" },
  { areaCode: "6500000", areaName: "新北市" },
];

describe("selectAreas", () => {
  it("returns every current county or city only once", () => {
    expect(selectAreas(areas)).toEqual([
      { areaCode: "6500000", areaName: "新北市" },
      { areaCode: "6300000", areaName: "臺北市" },
    ]);
  });

  it("returns an empty result when no current locations exist", () => {
    expect(selectAreas([])).toEqual([]);
  });
});
