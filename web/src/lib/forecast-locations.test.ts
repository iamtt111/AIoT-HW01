import { describe, expect, it } from "vitest";

import { selectLocations, type Location } from "./forecast-locations";

const locations: Location[] = [
  { countyCode: "630", countyName: "Taipei", townCode: "6300100", townName: "Songshan" },
  { countyCode: "630", countyName: "Taipei", townCode: "6300200", townName: "Xinyi" },
  { countyCode: "650", countyName: "New Taipei", townCode: "6500100", townName: "Banqiao" },
];

describe("selectLocations", () => {
  it("returns towns only from the selected county", () => {
    const selection = selectLocations(locations, "630");
    expect(selection.counties).toHaveLength(2);
    expect(selection.towns.map((town) => town.townCode)).toEqual(["6300100", "6300200"]);
  });

  it("returns no towns for an unknown county", () => {
    expect(selectLocations(locations, "999").towns).toEqual([]);
  });
});
