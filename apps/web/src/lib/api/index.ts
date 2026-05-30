import { mockClient } from './mock'
import type { ApiClient } from './client'

// Cliente activo. Para conectar el backend real (5-api.md), reemplazar
// `mockClient` por un `httpClient` que implemente la misma interfaz ApiClient.
export const api: ApiClient = mockClient

export type { ApiClient, MetadataPreview } from './client'
