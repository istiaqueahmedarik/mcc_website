'use client';

import { createContext, useContext } from 'react';

const TrainerVisualContext = createContext(false);

export function TrainerVisualProvider({ enabled, children }) {
  return <TrainerVisualContext.Provider value={enabled}>{children}</TrainerVisualContext.Provider>;
}

export function useTrainerVisuals() {
  return useContext(TrainerVisualContext);
}
