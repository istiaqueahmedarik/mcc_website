'use client'
import React from 'react'
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Plate } from '@udecode/plate/react';
import { Editor, EditorContainer } from '@/components/plate-ui/editor';
import { useCreateEditor } from './editor/use-create-editor';
function PlateVal({ value }) {
    const editor = useCreateEditor(
        {
            value: value,
            readonly: true,
        }
        
      );
    
  return (
      <div>
                          <Plate editor={editor}>
                            <EditorContainer>
                              <Editor variant="default" />
                            </EditorContainer>
                          </Plate>
    </div>
  )
}

export default PlateVal