# Data Model: Conversão de Vídeo

## VideoAsset

Representa o vídeo original ou convertido associado a um projeto.

| Field | Type | Rules |
|---|---|---|
| `id` | identifier | Unique within the project |
| `projectId` | identifier | Required; project access is enforced |
| `sourceAssetId` | identifier or null | Null for original; points to original for result |
| `storageUri` | string | Required; must refer to a complete stored file |
| `container` | string | MVP output is `mp4` |
| `videoCodec` | string | MVP output is `h264` |
| `audioCodec` | string or null | MVP output is `aac` when audio exists |
| `width`, `height` | integer | Positive; output no greater than the approved profile/MVP limit (currently proposed as 1080p) |
| `durationSeconds` | number | Positive and no greater than 600 for input |
| `sizeBytes` | integer | Positive and no greater than the approved profile/MVP limit (currently proposed as 500 MB for input) |

## VideoConversion

Represents the user-requested operation.

| Field | Type | Rules |
|---|---|---|
| `id` | identifier | Unique operation identifier |
| `userId` | identifier | Authenticated requester |
| `projectId` | identifier | Project containing the source |
| `sourceAssetId` | identifier | Must belong to the project and requester-accessible scope |
| `targetContainer` | string | One of the options returned by validation; MVP `mp4` |
| `targetVideoCodec` | string | MVP `h264` |
| `targetAudioCodec` | string or null | MVP `aac` when applicable |
| `targetWidth`, `targetHeight` | integer | Supported resolution, currently proposed up to 1080p; predefined resolutions remain pending Q2 |
| `status` | enum | `accepted`, `processing`, `completed`, `failed`, `cancelled` |
| `progress` | integer or null | 0-100 when known |
| `resultAssetId` | identifier or null | Set only after complete storage |
| `errorCode`, `errorMessage` | string or null | Required for `failed` |
| `quotaReservation` | identifier or null | Set when quota is reserved |
| `createdAt`, `updatedAt` | timestamp | Required |

## State transitions

```text
accepted -> processing -> completed
accepted -> cancelled
accepted -> failed
processing -> failed
```

`completed` requires a verified `resultAssetId`. `failed` requires an error reason and no
published completed result. `cancelled` is only valid before effective processing starts.

## Validation rules

- The requester must be authenticated and authorized for the project.
- Input format, codec, duration, dimensions and size must be validated before acceptance.
- Output options must come from the supported options returned by the service.
- The source asset is immutable.
- Quota is reserved atomically with acceptance and released when cancellation occurs before
  effective processing.
