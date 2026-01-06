/**
 * DISABLED: This component has missing dependencies:
 * - ./editor/use-create-editor (file doesn't exist)
 * - @/components/plate-ui/editor (directory doesn't exist)
 * 
 * This was causing build memory issues. Re-enable once dependencies are created.
 */

'use client'
import React from 'react'

// Placeholder component until plate-ui is properly set up
function PlateVal({ value }) {
  console.warn('PlateVal: Component disabled - missing plate-ui dependencies');
  return (
    <div className="p-4 border rounded bg-muted">
      <p className="text-muted-foreground">Rich text viewer not available</p>
      {typeof value === 'string' && <pre className="mt-2 text-sm">{value}</pre>}
    </div>
  );
}

export default PlateVal