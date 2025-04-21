'use client'

import {  ThemeProvider, Toaster, ToasterComponent, ToasterProvider } from '@gravity-ui/uikit';
import '@gravity-ui/uikit/styles/styles.css';
import '@gravity-ui/uikit/styles/fonts.css';
import { useEffect, useState } from 'react';
import { Editor } from './Editor';
const toaster = new Toaster();

const MarkdownEditor = ({ handleChange, value }) => {
    

    return (
        <div className='rounded-full'>
            <ThemeProvider theme='light-hc' rootClassName='arik' layout={'children'} scoped>
                <ToasterProvider toaster={toaster}>
                    <ToasterComponent />
                    <Editor onChange={handleChange} value={value} />

                </ToasterProvider>
            </ThemeProvider>
        </div>
    );
};

export default MarkdownEditor;