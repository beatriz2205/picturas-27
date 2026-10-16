# Video Conversion API Contract

The public API is exposed through the API Gateway. Paths below use the existing project route
convention and require a valid bearer token.

## Get supported options

`GET /api-gateway/:user/:project/video/:video/options`

Response `200`:

```json
{
  "source": {
    "id": "asset-id",
    "container": "mov",
    "videoCodec": "h264",
    "width": 1920,
    "height": 1080,
    "durationSeconds": 120,
    "sizeBytes": 10485760
  },
  "options": [
    {
      "container": "mp4",
      "videoCodec": "h264",
      "audioCodec": "aac",
      "width": 1280,
      "height": 720
    }
  ]
}
```

## Create conversion

`POST /api-gateway/:user/:project/video/:video/conversions`

Request:

```json
{
  "container": "mp4",
  "videoCodec": "h264",
  "audioCodec": "aac",
  "width": 1280,
  "height": 720
}
```

Response `202`:

```json
{
  "conversionId": "conversion-id",
  "status": "accepted",
  "progress": 0
}
```

Invalid options, permissions, quota, input metadata, duration or size return `400`, `401`, `403`
or `409` according to the failure. The response must include a stable error code and a
user-readable message.

## Get conversion status

`GET /api-gateway/:user/:project/video/conversions/:conversionId`

Response `200`:

```json
{
  "conversionId": "conversion-id",
  "sourceAssetId": "asset-id",
  "status": "processing",
  "progress": 50,
  "resultAssetId": null,
  "error": null
}
```

## Cancel conversion

`POST /api-gateway/:user/:project/video/conversions/:conversionId/cancel`

Response `200`:

```json
{
  "conversionId": "conversion-id",
  "status": "cancelled"
}
```

Cancellation after effective processing begins returns `409` and leaves the actual state
unchanged.

## WebSocket event

The existing project room receives `video-conversion-update`:

```json
{
  "conversionId": "conversion-id",
  "projectId": "project-id",
  "status": "processing",
  "progress": 50,
  "resultAssetId": null,
  "error": null
}
```

The event must never contain storage credentials or an unauthorized asset URL.
