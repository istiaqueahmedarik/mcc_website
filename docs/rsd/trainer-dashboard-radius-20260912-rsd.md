# Trainer dashboard reference corner radius

## Authorization and scope
The user requested the attached rounded-rectangle border-radius style on the trainer dashboard. Apply approximately 16px corners to dashboard buttons and form controls, keeping the existing 16px classroom panels. Keep compact summary chips at 12px and the padded view-switch wrapper at 20px for concentric corners. This is a radius-only adjustment; preserve layout, colors, behavior, and other routes.

## Implementation and acceptance
Use explicit Tailwind radius utilities in TrainerDashboardClient.js and TrainerDashboardWorkspace.jsx, including their loading/error/empty-state actions and co-trainer controls. Preserve the circular help launcher. Check the scoped diff and client lint. No server or dependency changes. Rollback removes only these radius utility changes.

## Follow-up correction
After the user reported no visible change, source inspection located the reference's exact “No live session” and “Manage” controls in the classroom header. Extend the 16px radius to these trainer-only controls and the alternate active-session button in `ClassroomLiveClient.js`. Preserve student corners and all existing edits in that file.

## Expanded classroom scope
The user requested the other radii too. Apply a trainer-only radius scope across all classroom tabs, including dialogs and popovers rendered through portals. Use a local 18px base token so existing rounded-md controls resolve to 16px, with explicit 16px large/extra-large panel corners. Keep fully rounded avatars, indicators, and the existing dock geometry. No layout or behavior changes.
