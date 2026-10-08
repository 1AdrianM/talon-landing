// Provisional data — validate before publishing (LANDING-HANDOFF.md §"Datos provisionales")
export const PROVISIONAL = {
  plan: {
    price:    '$49/mes',
    products: 100,
    label:    'hasta 100 productos',
  },
  setup: {
    time:  '5 minutos',
    label: 'Conectar tu tienda toma 5 minutos',
  },
  frequency: {
    default: 'una vez al día',
    label:   'revisión diaria, frecuencia configurable',
  },
} as const;

export type Provisional = typeof PROVISIONAL;
