# VM Excel Base Path Setup

This project reads rectifier component Excel files from a single environment base path.

## Required Environment Variable
- `EXCEL_BASE_PATH`

Example:
```env
EXCEL_BASE_PATH=C:/Users/epcsql/Desktop/masaustu_uygulama_data/fiyatlandırma excel
```

## Required Files Under `EXCEL_BASE_PATH`
- `Rectifier.xlsx`
- `CircuitBreakers.xlsx`
- `CurrentReadingCards.xlsx`
- `FreewheelingDiodes.xlsx`
- `Thyristors.xlsx`
- `DCChokes.xlsx`
- `DCCapacitors.xlsx`
- `Transformers.xlsx`
- `CoolingComponents.xlsx`
- `DiodeDroppers.xlsx`
- `Relays.xlsx`
- `ControlCards.xlsx`
- `MeasurementInstruments.xlsx`
- `CommunicationComponents.xlsx`
- `CommunicationProtocols.xlsx`
- `RelayAlarmOutputs.xlsx`
- `Cabinets.xlsx`

## Smoke Tests
1. Start server:
   - `npm run server`
2. Login and ensure token exists in browser localStorage:
   - `authToken`
3. Verify endpoint:
   - `GET /api/excel/rectifier/Terminals`
4. Expected status behavior:
   - `200`: file readable
   - `404`: file missing under `EXCEL_BASE_PATH`
   - `400`: invalid component type
   - `401`: missing/invalid auth token
