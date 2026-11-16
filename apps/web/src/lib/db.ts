import { openDB } from 'idb'

/** Base local del navegador: la biblioteca importada y las huellas sonoras. Nada de esto se sube. */
export const db = () =>
  openDB('serendipia', 3, {
    upgrade(d) {
      if (!d.objectStoreNames.contains('library')) d.createObjectStore('library')
      if (!d.objectStoreNames.contains('sound')) d.createObjectStore('sound')
    },
  })
