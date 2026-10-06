# Trainer classroom animated icons and action lenses

## User-authorized scope
Apply heroicons-animated icons to the trainer classroom UI. Apply the existing dock shader lens to grouped action rows, including Refresh / Generate report / Share, rather than only the People Groups control. Preserve each native action, disabled/busy states, selection, URL state, authorization and student presentation.

## Delivery
Reuse the existing shader and glass filters in a compact in-flow action-group component. Extend lens positioning for wrapped rows and hide the hover lens at rest for action groups, which do not represent selection. Keep 44px targets, visible focus, reduced-motion and contrast/transparency fallbacks, and cleanup GPU resources. Load upstream MIT icon source locally, adapting its Motion imports to the already installed Framer Motion runtime. Scope replacement through trainer context so shared student screens retain their icons and layout. Preserve upstream license and readable labels.

Grouped action shells retain their 28px rim but have no outer, active-state, inset, or hover-lens shadow. Classroom collapsibles use one shared height/fade/vertical motion recipe based on the requested shadcn-animated example, with 180–250ms transitions and an immediate reduced-motion path. Apply it to contest sources, dashboard section cards, and classroom details without changing their open state or action handlers.

## Verification
Run client lint and production build. Exercise an isolated action-group fixture on desktop/mobile and with keyboard, hover, disabled buttons and wrapped rows. Distinguish that evidence from authenticated classroom QA. Review changes in order: icon adapter/context, reusable action shell, shared lens geometry, then integrations.
