import { EventEmitter } from 'events'

declare global {
  var permissionsEmitter: EventEmitter | undefined
}

if (!globalThis.permissionsEmitter) {
  globalThis.permissionsEmitter = new EventEmitter()
}

export const permissionsEmitter = globalThis.permissionsEmitter
