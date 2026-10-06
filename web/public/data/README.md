# Taiwan county GeoJSON

`taiwan-counties.geojson` is a browser-ready county/city boundary asset for the
CWA `F-D0047-091` forecast MVP.

- Source: Ministry of the Interior township boundary dataset, version `1140318`
  (`local-data/鄉(鎮、市、區)界線1140318.zip`).
- Transformation: dissolve its 368 townships by `COUNTYCODE`, producing 22
  county/city features.
- Join key: CWA's eight-digit `Geocode` is compared to a feature's
  `cwa_area_code` after prefixing it with `cwa-`; for example,
  `10014000` joins `cwa-10014000`.

Validate a set of CWA codes with:

```powershell
node scripts/validate-county-geojson.mjs "10014000,63000000"
```
