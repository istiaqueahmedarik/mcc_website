import { Toaster } from 'sonner';

import { PlateEditor } from '@/components/editor/plate-editor';


export default function Page() {
  return (
    <div className="h-screen w-full" data-registry="plate">
        <PlateEditor />
      <Toaster />
    </div>
  );
}
