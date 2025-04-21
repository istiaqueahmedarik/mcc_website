'use client'
import React, { memo } from 'react';
import { MarkdownEditorView, MarkupString, useMarkdownEditor } from '@gravity-ui/markdown-editor';
import { Button } from '@gravity-ui/uikit';


export const Editor = memo(({ onChange, value }) => {
    console.log(value)
    const editor = useMarkdownEditor({
        md: {
            html: false,

        },
        initialValue: value,
        initial: {
            markup: value,
        }
    });

    React.useEffect(() => {
      
        const changeHandler = (e) => {
            const value = editor.getValue();
            onChange(value);
        };
        editor.on('change', changeHandler);
        return () => {
            editor.off('change', changeHandler);
        };
    }, [onChange]);

    return (
        <>
            <MarkdownEditorView settingsVisible enableSubmitInPreview={true} hidePreviewAfterSubmit stickyToolbar autofocus editor={editor} className='rounded-full' />
            
        </>
    );

});